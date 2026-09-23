# IrisOS Product And Architecture Plan

## Product Summary

IrisOS is an enterprise-grade SaaS operating system for freelancers, agencies, consulting firms, marketing organizations, creative studios, and multi-brand enterprises.

The product unifies finance, operations, clients, projects, reporting, forecasting, business intelligence, creative operations, automation, executive reporting, and proprietary AI intelligence.

Miles AI is the embedded intelligence layer. It should power insights, recommendations, forecasts, summaries, churn signals, agency performance scores, and Ask Miles experiences throughout the app.

Design Hub is an IrisOS-owned creative operations workspace powered by Canva workflows. Canva can be visible as the underlying provider, but IrisOS remains the primary product.

## Product Experience Requirements

- Build every main navigation route as a complete screen.
- Include realistic sample data, filters, tables, charts, detail states, and actions.
- Avoid placeholder pages, empty modules, fake "coming soon" screens, emojis, cartoon graphics, neon colors, bright blue, bright green, and bright red.
- Use premium enterprise design inspired by Linear, Vercel, Stripe, Ramp, Salesforce, Monday Enterprise, Notion, and Mercury.
- Use a graphite, charcoal, titanium, gunmetal, metallic silver, white, brushed aluminum, platinum, and chrome visual system.
- Keep workflows dense, practical, and suitable for repeated business use.

## Preferred Stack

- Framework: Next.js App Router with TypeScript
- Styling: Tailwind CSS
- UI primitives: shadcn/Radix-style components
- Icons: lucide-react
- Database: PostgreSQL
- ORM: Prisma ORM
- Auth: Auth.js
- Validation: Zod
- Charts: Recharts
- Tables: TanStack Table
- Unit tests: Vitest
- E2E tests: Playwright

## Architecture

Use a modular monolith: one Next.js application organized by domains, with shared UI, data access, validation, and service layers.

Prefer Server Components and server-side data loading for read-heavy pages. Use client components for charts, tables, filters, drawers, dialogs, builders, drag-and-drop surfaces, and command experiences.

Use mocked provider adapters for external services first. Do not hard-code provider behavior directly into UI components.

## Suggested Project Structure

```text
app/
  (app)/
    dashboard/
    finance/
    clients/
    projects/
    team/
    reporting/
    analytics/
    design-hub/
    prisma/
    automations/
    forecasting/
    operations/
    integrations/
    settings/
components/
  app-shell/
  charts/
  data-table/
  prisma/
  ui/
lib/
  auth/
  data/
  domains/
  integrations/
  prisma-ai/
  seed/
  validation/
prisma/
  schema.prisma
  seed.ts
tests/
```

## Core Data Families

- Organizations, brands, users, roles, permissions
- Clients, contacts, renewals, churn risk, upsell opportunities, ROI
- Projects, milestones, timelines, risks, resource allocations
- Invoices, expenses, subscriptions, cash flow, profitability, forecasts
- Team members, capacity, utilization, performance, hiring recommendations
- Reports, schedules, executive summaries, client report outputs
- Design assets, Canva projects, campaigns, brand kits, publishing schedules, approvals
- Automations, triggers, actions, runs, notifications
- Integrations, providers, connections, sync events, webhooks
- Miles insights, recommendations, forecasts, scores, analyses, chat messages

## Miles AI Service

Implement Miles AI behind an internal service boundary with deterministic mock output first.

The service should expose helpers for:

- Agency Health Score
- Client Profitability Score
- Client Churn Prediction
- Team Capacity Forecasting
- Profit Leak Detection
- Forecast Narratives
- Executive Summaries
- Ask Miles responses
- Creative Intelligence recommendations

## Testing Standard

Every feature should include:

- Unit tests for domain helpers and deterministic intelligence calculations.
- Route smoke tests for page rendering.
- Playwright workflow coverage for the main user path.
- Responsive checks for desktop and mobile layout quality.
# Execution architecture update (27 August 2026)

Authenticated workspace execution now uses a request-scoped Supabase/Prisma security context, server-only domain services, parallel page read models, Server Component page loaders, and narrow interactive Client Components. See `docs/architecture/iris-os-architecture.md` for current request paths, invariants, migration status, baselines, and rollback location.

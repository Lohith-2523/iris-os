# Iris OS Architecture Plan

## Preferred Stack

Use this stack unless the user explicitly chooses otherwise:

- Next.js App Router with TypeScript
- Tailwind CSS
- shadcn/Radix-style components
- lucide-react icons
- PostgreSQL
- Prisma ORM
- Auth.js
- Zod
- Recharts
- TanStack Table
- Vitest
- Playwright

## Architecture

Build Iris OS as a modular monolith. Keep one deployable application with domain-oriented routes, services, data access, validation, and integration adapters.

Prefer Server Components and server-side data loading where practical. Use client components for interactive tables, charts, filters, dialogs, builders, and command experiences.

Use database-backed seed data for dashboards, reports, forecasts, client intelligence, creative operations, integrations, and automation history.

Use mocked external adapters first. Keep adapter boundaries stable so live integrations can replace mocks later.

## Domains

Model the app around these domains:

- Dashboard
- Finance
- Clients
- Projects
- Team
- Reporting
- Analytics
- Design Hub
- Prisma
- Automations
- Forecasting
- Operations
- Integrations
- Settings

## Data Model Families

Include these model families when designing schemas and sample data:

- Organizations, brands, users, roles, and permissions
- Clients, contacts, renewals, churn risk, upsell opportunities, and ROI metrics
- Projects, milestones, resource allocations, project risks, and timelines
- Invoices, expenses, subscriptions, cash-flow points, profitability metrics, and forecasts
- Reports, report schedules, executive summaries, and client report outputs
- Design assets, Canva projects, campaigns, brand kits, publishing schedules, and approvals
- Automations, triggers, actions, runs, approvals, and notifications
- Integration connections, providers, sync events, and webhooks
- Prisma insights, forecasts, recommendations, scores, analyses, and Ask Prisma messages

## Integration Pattern

Use provider adapters for external capabilities:

- Canva design, asset, editing, and publishing workflows
- Social publishing platforms
- Accounting and finance systems
- CRM and client data systems
- Analytics and performance systems
- AI/model providers

Adapters should expose clear mock behavior, connection states, sync logs, and failure states. Avoid scattering provider-specific logic across UI components.

## Prisma AI Layer

Treat Prisma AI as an internal service layer that can power:

- Ask Prisma
- Forecasts
- Recommendations
- Risk detection
- Executive summaries
- Health and profitability scores
- Profit leak detection
- Creative intelligence

Use deterministic mock intelligence for the MVP unless live AI credentials are provided.

## Testing Expectations

Add unit tests for scoring helpers, forecast helpers, seed-data generators, integration adapters, and Prisma AI mock services.

Add Playwright coverage for every main navigation item and core workflows such as creating a client, inspecting profitability, generating a client report, reviewing churn risk, scheduling design publishing, approving a design asset, running an automation, and asking Prisma.

Check desktop and mobile layouts for text overflow, incoherent overlap, missing states, inaccessible controls, and incomplete pages.

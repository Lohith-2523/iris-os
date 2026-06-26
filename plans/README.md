# IrisOS Build Plans

Start here before building IrisOS. These files turn `app-prompt.docx` into an agent-friendly implementation plan.

## Source Of Truth

- Original prompt: `app-prompt.docx`
- Skill: `.codex/skills/irisos-builder`
- Product plan: `plans/product-and-architecture.md`
- Roadmap: `plans/implementation-roadmap.md`
- Feature specs: `plans/features/`

## Build Principle

IrisOS is a full-stack SaaS MVP, not a static mockup. Build a navigable, premium, enterprise-grade product shell with realistic data, database-backed domains, mocked integrations, and Prisma AI embedded across the experience.

Do not create placeholder pages. Every route should include real UI structure, realistic sample data, relevant actions, and at least one useful Prisma insight or workflow where appropriate.

## Recommended Agent Workflow

1. Read `plans/product-and-architecture.md`.
2. Read `plans/implementation-roadmap.md`.
3. Pick exactly one feature file from `plans/features/`.
4. Implement the feature end to end with shared layout, seed data, route coverage, and tests.
5. Run the acceptance checks listed in that feature file.
6. Update the relevant feature file only if implementation discoveries change the plan.

## Feature Build Order

1. Foundation and shared shell
2. Dashboard
3. Prisma
4. Finance
5. Clients
6. Projects
7. Team
8. Reporting
9. Analytics
10. Forecasting
11. Design Hub
12. Automations
13. Operations
14. Integrations
15. Settings


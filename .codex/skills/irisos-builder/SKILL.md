---
name: irisos-builder
description: Build, plan, scaffold, extend, or review Iris OS, an enterprise-grade SaaS operating system for agencies, freelancers, consulting firms, marketing organizations, creative studios, and multi-brand enterprises. Use when Codex needs to work from the Iris OS product prompt, define the Iris OS tech stack or architecture, implement Iris OS modules, create realistic enterprise dashboards and workflows, integrate Prisma AI experiences, or design the Canva-powered Design Hub.
---

# Iris OS Builder

Use this skill to plan, scaffold, extend, or review Iris OS. Treat Iris OS as a full-stack SaaS MVP unless the user narrows scope.

## Required References

Read `references/product-spec.md` before planning or implementing product features.

Read `references/architecture-plan.md` before choosing stack, schemas, routing, data flow, tests, or app structure.

## Product Rules

Keep Iris OS premium, executive, enterprise-grade, and production-ready. Every planned or implemented screen should feel complete, navigable, and useful with realistic sample data.

Avoid placeholder pages, incomplete modules, emojis, cartoon graphics, neon colors, bright blue, bright green, and bright red.

Use Prisma AI as a proprietary intelligence layer embedded across modules, not only as a standalone page. Surface Prisma insights, forecasts, recommendations, scores, risks, and executive summaries wherever they clarify decisions.

Build Design Hub as an Iris OS-owned experience powered by Canva workflows. Canva may be visible as the underlying design provider, but Iris OS remains the primary product and interaction shell.

## Implementation Posture

Prefer a modular monolith with domain-oriented routes, services, data access, and integration adapters.

Use mocked external integrations first unless the user provides credentials or explicitly asks for live providers.

Use database-backed seed data for dashboards, reports, forecasts, client intelligence, creative operations, and automation history.

When reviewing or extending Iris OS, check that new work preserves the product identity, module coverage, design constraints, Prisma integration, and no-placeholder standard described in the references.

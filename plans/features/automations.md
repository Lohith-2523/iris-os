# Feature Plan: Automations

## Goal

Build automation systems for cross-module workflows, creative operations, approvals, reporting, notifications, and integration events.

## Screens

- Automations dashboard
- Automation builder
- Templates
- Run history
- Approval workflows
- Error and retry queue

## Build

- Add automation templates for client reporting, invoice reminders, churn alerts, design approvals, publishing workflows, project risk alerts, and executive reports.
- Builder should support trigger, conditions, actions, owner, status, and run preview.
- Run history should show success, failed, pending approval, skipped, and retry states.
- Include Prisma recommendations for automation opportunities.

## Data

Use automations, triggers, conditions, actions, runs, approvals, notifications, clients, projects, reports, design assets, and integrations.

## Acceptance Checks

- Users can inspect and run a mocked automation.
- Failed runs include clear reason and retry action.
- Automation templates reference real CrystalOS workflows.
- Prisma suggests automations based on seeded risks or repetitive tasks.


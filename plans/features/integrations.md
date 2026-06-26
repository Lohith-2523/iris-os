# Feature Plan: Integrations

## Goal

Build integration management for Canva, social publishing, accounting, CRM, analytics, and AI/model providers.

## Screens

- Integration directory
- Connected apps
- Integration detail
- Sync logs
- Webhooks
- Credentials and connection state

## Build

- Show provider cards for Canva, social platforms, accounting tools, CRM, analytics, and AI providers.
- Include connected, disconnected, syncing, failed, needs attention, and rate-limited states.
- Provide mocked connect/disconnect, sync now, view logs, and webhook test actions.
- Keep provider behavior behind adapter interfaces.

## Data

Use integration providers, connection records, sync events, webhook events, credential metadata, and related module entities.

## Acceptance Checks

- Integration states are realistic and actionable.
- Sync logs include successes and failures.
- Canva integration connects visibly to Design Hub.
- No live credentials are required for MVP behavior.


# Feature Plan: Dashboard

## Goal

Build the Agency Command Center: the executive home screen for agency health, financial performance, delivery risk, capacity, client status, and Prisma recommendations.

## Screens

- Main dashboard
- Agency Health Score detail drawer
- Profit leak detail drawer
- Executive alerts panel
- Recent activity and operational queue

## Build

- Show Agency Health Score, monthly revenue, margin, cash runway, utilization, churn risk, forecast variance, and active project risk.
- Include charts for revenue trend, profitability by client segment, capacity utilization, and pipeline forecast.
- Surface Prisma executive summary, strategic recommendations, opportunity detection, and profit leak alerts.
- Link dashboard cards into Finance, Clients, Projects, Team, Reporting, and Forecasting.

## Data

Use seeded finance, client, project, team, forecast, and Prisma insight records. Dashboard metrics should be computed from shared data rather than isolated constants.

## Acceptance Checks

- Dashboard renders as a complete executive view.
- Every metric links to a relevant module or detail state.
- Prisma insights are visible without opening a separate Prisma page.
- Mobile layout stacks cleanly without text overflow.


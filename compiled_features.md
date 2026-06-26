# CrystalOS Feature Directory

This document compiles all the features currently developed and planned for CrystalOS based on the feature build plans.

---

## 1. Foundation & App Shell
- **Status**: Developed
- **Goal**: Full-stack base for the application, establishing design layout, routing, database structure, and testing framework.
- **Key Developed Features**:
  - Premium titanium/gunmetal grey app shell featuring a collapsable sidebar navigation.
  - Sidebar profile footer that dynamically displays the logged-in user profile, email, and initials (using a `/api/user?email={email}` lookup).
  - Topbar global command center with quick query search and direct Ask Prisma AI hooks.
  - Radix/shadcn-inspired zero-border flat aesthetic.
  - Test runner integrations (Vitest/Playwright setup).

## 2. Agency Command Center (Dashboard)
- **Status**: Developed
- **Goal**: The executive home screen summarizing agency health, financial performance, delivery risk, capacity, and client status.
- **Key Developed Features**:
  - Real-time metric cards for Monthly Revenue, Active Clients, Team Workloads, and Agency Health Score.
  - Active insight cards highlighting profit leaks and client churn risk.
  - Quick action links routing the user directly into the relevant detail pages.

## 3. Prism AI flag intelligence
- **Status**: Developed
- **Goal**: Embedded AI assistant powering recommendations, forecasts, summaries, and chat responses.
- **Key Developed Features**:
  - Ask Prism chat terminal supporting dynamic suggestions ("Summarize portfolio health scores").
  - Dynamic user-name parsing through the `formatUserMessage` utility, translating mock "Lohith" prompts to use the active logged-in user's first name/full name based on local storage email.

## 4. Finance operating center
- **Status**: Developed
- **Goal**: Manage revenue, profitability, cash flow, expenses, subscriptions, and forecasts.
- **Key Developed Features**:
  - Financial charts visualizing MRR, ARR, gross margins, and cash runways.
  - AI subscription tracker highlighting redundant SaaS seat billing and contractor spend leaks.

## 5. Client Portfolio & Onboarding
- **Status**: Developed (updated onboarding UX)
- **Goal**: Portfolio lookup, health indexes, renewal timelines, and dynamic onboarding wizards.
- **Key Developed Features**:
  - Clean client list with health indicator badges (Excellent, Good, Fair, Risk).
  - 6-step Industry-Specific Client Onboarding wizard (Company Profile, POC, Service Scope, Checklist Specs, Goals/Budget, Review).
  - Dynamic fields customized for 10 agency types (e.g. tech stack for Web Design, active platforms for Social Media).
  - ADMIN role gate restricting onboarding access (MEMBER roles view Access Denied screen).
  - Implicit logged-in user review without switcher.

## 6. Settings & Plan Governance
- **Status**: Developed
- **Goal**: Manage organization defaults, brand presets, user permissions, and billing plan limits.
- **Key Developed Features**:
  - Plan Selection panel (Basic vs Pro vs Advanced) enforcing limits on agency specialization counts (1 type for Basic, 5 for Pro, All for Advanced).
  - Real-time validation checking selections and showing error banners when selected types exceed plan parameters.

## 7. Projects & Delivery
- **Status**: Planned (Under Development)
- **Goal**: Track project milestones, timelines, resource allocation, and team dependencies.
- **Upcoming Features**:
  - Gantt/timeline view tracking project progress.
  - Risk registers linking project delay alerts back to client health scores.

## 8. Team & Capacity Operations
- **Status**: Planned (Under Development)
- **Goal**: Utilization rates tracker, team workloads capacity planner, and AI-driven hiring recommendations.
- **Upcoming Features**:
  - Dynamic capacity planner detailing overloaded designers.
  - Performance indicators tracking task fulfillment speed.

## 9. Reporting Engine
- **Status**: Planned (Under Development)
- **Goal**: Client performance report compilations, scheduled reviews, and exportable data summaries.
- **Upcoming Features**:
  - PDF/CSV mocked exports formatting client data for review meetings.
  - Automation triggers scheduling monthly profitability reports.

## 10. Graph Analytics
- **Status**: Planned (Under Development)
- **Goal**: Cross-module business intelligence and cohort analysis.
- **Upcoming Features**:
  - X-Y chart parameter controllers to plot revenue vs. utilization.
  - Benchmark performance logs contrasting current quarters.

## 11. Canva-Powered Design Hub
- **Status**: Planned (Under Development)
- **Goal**: Programmatic creative operations workspace integrated with Canva Connect APIs.
- **Upcoming Features**:
  - Design library folders syncing canvas files in real-time.
  - Brand kit assets manager.
  - AI layout compliance check (logo contrast, colors checker).
  - Programmatic autofill generator creating banner variations.

## 12. Automations & Triggers
- **Status**: Planned (Under Development)
- **Goal**: Visual builder for trigger-action workflows.
- **Upcoming Features**:
  - Drag-and-drop workflow steps.
  - Execution history tracking retry queues.

## 13. Operations & Work Queues
- **Status**: Planned (Under Development)
- **Goal**: SLA trackers, request queues, and cross-team approval workflows.
- **Upcoming Features**:
  - Queue managers sorting client assets feedback.

## 14. Integrations Directory
- **Status**: Planned (Under Development)
- **Goal**: Connect external provider adapters (Canva, HubSpot, QuickBooks).
- **Upcoming Features**:
  - Live connection settings and sync activity log streams.

# Request rate-limit audit

Every `/api/*` request is classified in `shared/lib/request-rate-limit.ts` and checked by the Next.js proxy before authentication or route work begins. The limiter is deliberately generous for normal product use and uses a token bucket so short page-load bursts succeed while sustained automation is slowed. Existing stricter controls—such as coupon-guess lockouts, Miles AI request limits, plan entitlements, and AI-credit accounting—still apply.

| Category | Sustained allowance | Burst | Current request groups |
| --- | ---: | ---: | --- |
| Light but critical | 1,200 per 5 minutes | 180 | Read/heartbeat requests for pricing, workspace, workspace revision, user, organization, plan usage, activity, notifications, shared data, Miles usage, and the messaging stream |
| Normal user actions | 600 per 10 minutes | 120 | Ordinary CRUD and list actions for agency leads, AI sessions, calendar, clients, daily briefing, deliverables, help center, integrations, invoices, members, messaging, Meta portal, onboarding completion, projects, retainers, security users, subscriptions, tasks, and transactions |
| Expensive file operations | 60 per 15 minutes | 12 | Upload, export, PDF, download, transcription, generated-document creation, report generation, strategy generation, proposal/legal document creation, and Canva banner rendering |
| Abuse-sensitive operations | 120 per 10 minutes | 20 | Authentication and access flows, admin mutations, account deletion, payments, coupon redemption, invitations, document-signing tokens, Miles chat/realtime, OAuth callbacks, messaging identity, Meta deletion/deauthorization, waitlist/cron, and webhooks |

## Complete route grouping

Method-specific routes can appear in more than one category. Unlisted future API routes default to **Normal user actions**, so they remain protected until explicitly reclassified.

### Light but critical requests

- `GET /api/atlas-ai/usage`, `/api/data`, `/api/organization`, `/api/plan-usage`, `/api/pricing`, `/api/user`, `/api/workspace`, `/api/workspace/revision`
- `GET|POST /api/activity`, `/api/notifications`
- `GET /api/messaging/stream`

### Normal user actions

- `/api/agency-leads`, `/api/atlas-ai/sessions`, `/api/atlas-ai/sessions/[id]`, `/api/calendar`, `/api/clients`, `/api/daily-briefing`, `/api/deliverables`
- Non-generation operations on `/api/generated-documents`, plus `/api/help`, `/api/integrations`, `/api/invoices`, `/api/member`
- `/api/messaging`, `/api/messaging/devices`, `/api/messaging/messages`, `/api/meta-ad-accounts`, `/api/meta-portal`
- `/api/onboarding/complete`, `/api/projects`, `GET /api/reports`, `/api/retainers`, `/api/security/users`, `GET /api/strategies`
- `/api/subscriptions`, `/api/tasks`, `/api/transactions`, plus non-read mutations on otherwise light routes

### Expensive file creation and reading

- `/api/agency-leads/export`, `/api/atlas-ai/transcribe`, `/api/canva/designs/banner`, `/api/onboarding/upload`
- `/api/document-signing/[token]/pdf`, `/api/generated-documents/[id]/download`, `/api/generated-documents/[id]/pdf`, `/api/invoices/[id]/pdf`, `/api/reports/[id]/pdf`, `/api/strategies/[id]/pdf`
- `/api/legal-documents/pdf`, `/api/proposals/pdf`
- `POST /api/generated-documents`, `POST /api/reports`, `POST /api/strategies`

### Abuse-sensitive operations

- `/api/account`, `/api/admin/manage`, `/api/auth/*`, `/api/create-order`, `/api/verify-payment`, `/api/plan-coupons/redeem`
- `/api/atlas-ai`, `/api/atlas-ai/realtime/session`, `/api/atlas-ai/realtime/usage`, `/api/help/ask`
- `/api/canva/auth`, `/api/canva/callback`, `/api/canva/return`, `/api/integrations/google/start`, `/api/integrations/google/callback`
- `/api/document-signing/[token]`, `/api/invite`, `/api/messaging/identity`, `/api/meta-ads/*`
- `/api/waitlist`, `/api/cron/waitlist-daily`, `/api/webhooks/*`

## Runtime behavior

- Signed-in light, normal, and file traffic is keyed by a one-way in-memory fingerprint of the session; anonymous traffic falls back to the ingress IP.
- Abuse-sensitive traffic stays IP-bound so rotating sessions does not reset the allowance.
- Rejected requests return HTTP `429`, `Retry-After`, `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Policy`, and `X-RateLimit-Category` headers.
- Buckets are process-local and memory-bounded. This protects each application instance without adding a database query to every request. If horizontally scaled instances later require a single global quota, move the same policy interface to a shared Redis-compatible store.

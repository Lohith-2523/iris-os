# Iris OS - Enterprise Agency Operating System

The agent likes turtles. 

Iris OS is an enterprise-grade SaaS operating system designed for creative agencies, consulting firms, marketing organizations, and multi-brand enterprises. It unifies operations, client relationship tracking, financial auditing, project delivery metrics, Canva-powered asset management, and live Meta campaign integrations within a single, high-fidelity command center.

---

## 🚀 Key Modules & Capabilities

### 1. Agency Command Center (Dashboard)
* **Performance Indicators**: Real-time tracking of revenue streams, profit margins, active contractor allocations, and team utilization.
* **Proactive Intelligence**: Built-in risk detection, cost-leak signals, and actionable operations recommendations.

### 2. Atlas AI Engine
* **Atlas AI Intelligence**: Leverages Atlas AI with Gemini and ChatGPT capabilities to delegate intelligence queries based on complexity.
* **Contextual Features**: Powers SaaS cost audits, rolling cash flow forecasting, strategy checklist generation, and direct conversational database querying.

### 3. Meta Ads & Leads Manager
* **Campaign Hierarchy**: Deep visual hierarchy displaying campaigns, ad sets, ads, and performance metrics (spend, reach, CTR, impressions).
* **Leads Ingestion Webhook**: Handles secure realtime Meta lead generation webhooks to capture customer profile inputs instantly.
* **Canva Sync**: Direct creative asset synchronization pushing images designed in the Design Hub into active ad accounts.

### 4. Design Hub (Canva integration)
* **Asset Library**: Integrated brand centers, approval queues, content calendars, and metadata catalogs.
* **Design Workspace**: Mocked and live Canva Connect workflows allowing teams to design, collaborate, and export assets directly.

### 5. Client Portfolio & Finance Ledger
* **Invoice Auditing**: Secure ledger for client invoices, QuickBooks ERP synchronization, and automated payment gateway webhooks (Stripe, PayPal, Razorpay).
* **Delivery Engine**: Detailed project roadmaps linked directly to contractor schedules and utilization limits.

---

## 🛠️ Tech Stack

* **Framework**: Next.js App Router (React 19)
* **Language**: TypeScript
* **Database**: PostgreSQL (Prisma ORM)
* **Authentication**: Supabase Auth (with mock sandbox bypass for offline development)
* **Styling**: Vanilla CSS with Tailwind CSS tokens
* **Testing**: Vitest (Unit) & Playwright (E2E)

---

## ⚙️ Getting Started

### 1. Prerequisites
Ensure you have Node.js (version 20+) and a running PostgreSQL instance locally or remotely.

### 2. Installation
Install the project dependencies:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory and define the following keys (see `.env` for references):
```env
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/irisos?schema=public"
DIRECT_URL="postgresql://<user>:<password>@localhost:5432/irisos?schema=public"
DATABASE_POOL_MAX="5"
AUTH_SECRET="your-auth-secret"
AUTH_ACCESS_SECRET="a-stable-random-secret-of-at-least-24-characters"
CRON_SECRET="a-random-secret-used-by-scheduled-routes"
MESSAGING_ENCRYPTION_KEY="a-stable-random-secret-of-at-least-32-characters"
META_WEBHOOK_VERIFY_TOKEN="irisos_meta_verify_token"
GEMINI_API_KEY="your-google-ai-api-key"
OPENAI_API_KEY="your-openai-api-key"
OPENAI_TRANSCRIPTION_MODEL="gpt-transcribe"
OPENAI_HELP_MODEL="gpt-5-mini"
OPENAI_REALTIME_MODEL="gpt-realtime"
OPENAI_REALTIME_TRANSCRIPTION_MODEL="gpt-4o-mini-transcribe"
OPENAI_REALTIME_VOICE="cedar"
GOOGLE_OAUTH_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_OAUTH_CLIENT_SECRET="your-google-oauth-client-secret"
GOOGLE_SHEETS_OAUTH_USER_EMAIL="cto.admin@irisos.app"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_REQUIRE_TLS="true"
SMTP_USER="noreply@irisos.app"
SMTP_PASSWORD="your-google-app-password"
APP_URL="https://irisos.app"
```

`AUTH_ACCESS_SECRET` signs the first-party device grant that permits the login
and signup pages to open. Keep it stable across deployments; rotating it revokes
all existing device grants. The hourly waitlist invitation cron uses
`CRON_SECRET` and sends each signup invitation 24–48 hours after registration.

`MESSAGING_ENCRYPTION_KEY` encrypts account-scoped messaging private keys at rest. Keep it stable across deployments; changing or losing it makes stored message keyrings unreadable. When omitted, the app falls back to `INTEGRATION_ENCRYPTION_KEY` and then `AUTH_SECRET` for compatibility.

For a serverless Supabase deployment, use the transaction-pooler URL (port
`6543`, with `?pgbouncer=true`) for runtime `DATABASE_URL`. Keep `DIRECT_URL` on
the direct or session-mode connection for Prisma migrations and introspection.

Transactional onboarding and meeting email is delivered over Gmail SMTP or
Google Workspace SMTP Relay as `Iris OS <noreply@irisos.app>`. For Gmail SMTP,
use `smtp.gmail.com`, port `587`, and an app password. For Google SMTP Relay,
use `smtp-relay.gmail.com` with the port, TLS mode, authentication, and allowed-IP
settings configured in Google Workspace. `SMTP_USER` and `SMTP_PASSWORD` may be
omitted together when the relay authorizes the deployment server by IP. Atlas
meeting coordination always uses Gemini; the creating user must also connect
Google Calendar with event-management access.

Help requests and waitlist registrations use the existing Google OAuth client
and an encrypted connected-account refresh token. Set `GOOGLE_SHEETS_OAUTH_USER_EMAIL`
to the connected Google account that owns or can edit both sheets (it defaults to
`cto.admin@irisos.app`), then reconnect that account once to approve the Sheets scope. Iris creates the header row when
the first worksheet is empty.

### 4. Initialize Database
Initialize the database schemas and populate the mock enterprise seed data:
```bash
npm run init
# This runs: prisma generate && prisma db push && prisma db seed
```

### 5. Run Development Server
Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to access the dashboard.

---

## 🧪 Testing & Verification

### Unit and Integration Tests
Run unit tests with Vitest:
```bash
npx vitest run
```

### End-to-End Tests
Execute Playwright E2E testing:
```bash
npx playwright test
```

---

## 🔒 Security & Webhooks
For detailed listings of configured callback URLs, API redirect URIs, scopes, and verification tokens for Canva, QuickBooks, HubSpot, Stripe, and Meta webhooks, refer to the [Integrations Endpoints Directory](integrations_endpoints.md).

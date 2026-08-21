const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../..');
const outDir = path.join(root, 'output', 'pdf');
const qaDir = path.join(root, 'tmp', 'pdfs', 'iris-feature-catalog-qa');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(qaDir, { recursive: true });
for (const name of fs.readdirSync(qaDir)) {
  if (/^(page|contact)-\d+\.png$/.test(name)) fs.unlinkSync(path.join(qaDir, name));
}

const outputPdf = path.join(outDir, 'iris-os-end-user-feature-catalog.pdf');
const outputHtml = path.join(qaDir, 'iris-os-end-user-feature-catalog.html');
const logo = fs.readFileSync(path.join(root, 'public', 'iris-logo-white-transparent.png')).toString('base64');

const featureSets = [
  {
    title: 'Agency Command Center', status: 'Available now', eyebrow: 'Executive visibility',
    promise: 'Run the agency from one real-time operating view.',
    groups: [
      ['Performance snapshot', ['Monthly revenue and recognized revenue', 'Gross billings, total expenses, operating profit, and net profit', 'Active projects and project-risk flags', 'Pending receivables and outstanding invoices', 'Agency leads totals, warm leads, and pipeline movement']],
      ['Operational focus', ['Priority-task queue with due dates', 'Today\'s meetings and schedule', 'Onboarded client portfolio by contract value', 'Active project status and progress', 'Notifications, reminders, approvals, delays, and messages']],
      ['Workspace activation', ['Guided setup for integrations, financial ledger, invoices, and leads', 'Downloadable CSV/XLSX templates', 'Google and Meta connection prompts', 'Skip-and-resume activation steps', 'Quick actions for new clients and Atlas AI']],
      ['Everyday navigation', ['Collapsible, role-aware sidebar', 'Global command search with keyboard shortcut', 'Quick route and action commands', 'Dark and light workspace themes', 'Organization branding and profile access', 'Responsive mobile navigation']],
    ],
  },
  {
    title: 'Agency Leads & Sales Pipeline', status: 'Available now', eyebrow: 'Lead acquisition',
    promise: 'Capture, qualify, follow up, and convert every opportunity.',
    groups: [
      ['Visual pipeline', ['Kanban stages for procured, warm, cold, lost, closed, and custom states', 'Drag-and-drop lead movement', 'Custom stage names, colors, and ordering', 'Safe stage removal with lead reassignment', 'Lead totals, wins, losses, and win rate', 'Search by name, email, phone, or funnel']],
      ['Lead records', ['Manual lead entry with contact details and estimated value', 'Acquisition method: Instagram, Facebook, ads, referral, email, phone, LinkedIn, or cold outreach', 'Follow-up date and time', 'Lead detail card and activity timeline', 'WhatsApp outreach shortcut', 'Lost-reason capture and notes', 'Delete and archive controls']],
      ['Bulk operations', ['Downloadable CSV and XLSX import templates', 'Drag-and-drop spreadsheet upload', 'Template validation and staged row review', 'Discard or confirm individual imported leads', 'Historical lead export to Excel', 'Custom export date range including archived records and Meta attribution']],
      ['Conversion actions', ['Send a proposal from the lead record', 'Schedule a meeting', 'Mark leads lost with standardized reasons', 'Import closed leads directly into client onboarding', 'Preserve source, value, follow-up, status, and conversion history']],
    ],
  },
  {
    title: 'Client Portfolio & Onboarding', status: 'Available now', eyebrow: 'Client lifecycle',
    promise: 'Turn a qualified lead into a structured, billable client workspace.',
    groups: [
      ['Portfolio management', ['Client list with active/inactive state', 'Active-project count per client', 'Assigned specialists', 'Annual contract value', 'Client deletion with explicit destructive-action confirmation', 'Administrator-only client creation']],
      ['Company and billing profile', ['Company and legal entity details', 'Business description and business model', 'Billing address, country, postal code, and optional GST/tax number', 'Primary contact name, role, email, and phone', 'Closed-lead import with conversion attribution', 'Invoice-readiness validation']],
      ['Industry-specific discovery', ['Digital marketing budgets, CAC targets, and performance history', 'Social platforms, posting frequency, and brand voice', 'SEO traffic, CMS, and keyword targets', 'Paid-ad account and ROAS requirements', 'Brand positioning, vision, creative, identity, content, video, and web-development briefs', 'Ten agency-specialization profiles supported']],
      ['Initial engagement setup', ['Create or skip the first project', 'Select service line from agency specializations', 'Retainer or one-time commercial terms', 'Payment amount, cadence, invoice date, due date, and terms', 'Internal delivery budget and deadline', 'Up to eight project stages with equal timeline distribution', 'Initial deliverables and team allocation', 'Optional automatic invoice email', 'Secure client invitation link']],
    ],
  },
  {
    title: 'Client Management Workspace', status: 'Available now', eyebrow: 'Account delivery',
    promise: 'Give account owners a complete operating record for every client.',
    groups: [
      ['Operations overview', ['Revenue, receivables, team, tasks, and overall progress', 'Client account details, agency service, and business model', 'Primary and additional contacts', 'Assigned specialist visibility', 'Client-dashboard activation link and invite status']],
      ['Projects and billing', ['Project breakdown by workflow, tasks, deliverables, change requests, and team', 'Project-bound invoice generation from commercial terms', 'Client billing-profile editor', 'Invoice status, balance, and PDF access', 'No-invoice and no-project readiness states']],
      ['Task and delivery controls', ['Create client tasks and assign staff', 'Task status, progress, blockers, and recent updates', 'Submitted deliverable links and client notes', 'Approval queue for client review', 'Project-wide change-request tracking']],
      ['Specialized account intelligence', ['Meta account association and data sync', 'Campaign spend, impressions, clicks, CTR, CPC, CPM, and reach', 'Lead totals, CPL, conversion rate, and recent pipeline', 'SEO keyword positions, traffic, domain authority, site health, and Lighthouse indicators', 'Website architecture and managed-channel snapshots']],
    ],
  },
  {
    title: 'Projects & Delivery Programs', status: 'Available now', eyebrow: 'Delivery management',
    promise: 'Plan commercial work, stage delivery, and keep risk visible.',
    groups: [
      ['Project portfolio', ['Active/total projects, backlog, contract value, and delays', 'Client, service line, timeline, progress, and risk', 'Late stage and task counts', 'Expandable project cards and full detail workspace', 'Links to task management and client onboarding']],
      ['Project creation', ['Client association and service focus', 'Timeline description, start date, and target deadline', 'Retainer or one-time payment model', 'Payment amount, cadence, invoice date, and terms', 'Automatic invoice generation and optional delivery email', 'Internal budget and risk assessment', 'Specialist assignment and initial deliverables', 'Optional client Meta feature enablement']],
      ['Workflow structure', ['Up to eight stage gates', 'Automatic equal timeline distribution', 'Stage progress and due dates', 'Task counts and overall completion', 'Backlog support for unassigned work', 'Project status: not started, in progress, completed, on hold, or overdue']],
      ['Project breakdown', ['Overview, workflow, tasks, deliverables, change requests, and team tabs', 'Commercial summary and delivery health', 'Assigned-member and payment details', 'Open deliverable links and submitted-by metadata', 'Direct handoff to the full task workspace']],
    ],
  },
  {
    title: 'Tasks, Approvals & Change Control', status: 'Available now', eyebrow: 'Work orchestration',
    promise: 'Move work from backlog to client-approved delivery with a traceable record.',
    groups: [
      ['Task workspace', ['Kanban and list views', 'Filter by project and group by status or stage', 'Columns for to-do, active, blocked, completed, and backlog', 'Drag-and-drop status updates', 'Client, project, stage, specialist, timeline, progress, and approval fields']],
      ['Task authoring', ['Title, description, stage, assignee, status, timeline, and deadline', 'Client-approval requirement', 'Blocker/intervention notes', 'Progress percentage and recent update', 'Deliverable descriptions and external links', 'Permanent deletion with linked-record warning']],
      ['Collaboration history', ['Specialist activity log', 'Internal comments and discussions', 'Latest progress update', 'Blocker visibility', 'Parent/current/next stage handover chain', 'Client approval and requested-change outcomes']],
      ['Change requests', ['Client project-level or deliverable-level requests', 'Agency questions, constraints, and response', 'Alternate-scope proposal', 'Proposed, discussion, and finalized states', 'Atlas-assisted task-plan adaptation after finalization', 'Traceable client and agency decision record']],
    ],
  },
  {
    title: 'Team & Resource Management', status: 'Available now', eyebrow: 'People operations',
    promise: 'Onboard specialists, allocate work, and keep delivery ownership clear.',
    groups: [
      ['Team directory', ['Headcount and full-time team summary', 'Filter by role/title', 'Contact, role, projects, and task counts', 'Project assignment matrix', 'Specialist detail and assigned-task view']],
      ['Onboarding paths', ['Create a new specialist profile', 'Allocate an existing specialist', 'Secure email invitation and copyable activation link', 'Password or Google sign-on activation', 'Assign agency disciplines and active projects', 'Reallocate active specialists']],
      ['Bulk team import', ['Download CSV/XLSX templates', 'Upload spreadsheets up to 5 MB', 'Atlas AI field extraction from custom layouts', 'Editable staging table', 'Per-row name, email, phone, role, and project review', 'Batch specialist import']],
      ['Performance and offboarding', ['Task status and progress controls', 'Blocker notes and progress updates', 'View specialist task history', 'Immediate access revocation', 'Automatic project-assignment removal and task unassignment', 'Handover feedback emailed to the member']],
    ],
  },
  {
    title: 'Finance Operating Center', status: 'Available now', eyebrow: 'Financial control',
    promise: 'Reconcile cash, profitability, obligations, and receivables in one ledger.',
    groups: [
      ['Financial overview', ['All-time, yearly, quarterly, and monthly views', 'Ledger-recognized revenue', 'Operating expenses and expense-category mix', 'Cash available and liquidity', 'Net profit and profit margin', 'Client-level revenue, expenses, profit, and margin', 'Receivables queue and outstanding balances']],
      ['Unified ledger', ['Combined transaction log across channels', 'Transaction ID, account, date, amount, and status', 'Manual income and expense entries', 'Invoice-linked receipts', 'Payment methods: UPI, IMPS, NEFT, cash, and other', 'Configured bank account selection', 'Transaction comments and deletion']],
      ['Recurring commitments', ['Recurring SaaS, AI, software, operations, and other expenses', 'Frequency and start-date configuration', 'Edit recurring amount and recurrence bounds', 'AI subscription cost breakdown', 'Consumption/seat-based subscription visibility', 'Expense contribution to total costs']],
      ['Financial reporting', ['Custom X-axis grouping by category, source, or time', 'Metrics for revenue, expenses, profit, and margin', 'Custom timeframe report builder', 'Generated report view with matching-data states', 'Excel export', 'Bulk import from the Iris OS financial workbook template']],
    ],
  },
  {
    title: 'Invoices & Commercial Billing', status: 'Available now', eyebrow: 'Billing workflows',
    promise: 'Create professional billing documents directly from project or lead context.',
    groups: [
      ['Invoice register', ['Tax invoices and proforma quotations in one archive', 'Document number, customer, project, dates, status, amount, and balance', 'Unpaid, partially paid, and fully paid states', 'PDF download', 'Edit and recalculate invoices', 'Delete invoices with confirmation']],
      ['Project tax invoices', ['One-click generation from project payment terms', 'Manual line items with quantity and unit price', 'Tax rate on subtotal', 'Invoice summary and terms', 'Agency and client billing-profile validation', 'Generate, email to client, and download PDF in one flow']],
      ['Standalone proforma invoices', ['Create for a saved lead or manual customer', 'Quotation number, issue date, validity, and reference title', 'Complete customer billing identity and optional GST/tax registration', 'Editable line items, tax, subtotal, and total', 'Validity, delivery, payment, and cancellation terms']],
      ['Commercial consistency', ['Project-owned retainer and one-time schedules', 'Monthly, quarterly, or yearly cadence', 'Fourteen-day due-date convention', 'Invoice-linked ledger receipts', 'Revenue recognized only when a receipt is entered']],
    ],
  },
  {
    title: 'Proposals, Contracts & E-Signatures', status: 'Available now', eyebrow: 'Document lifecycle',
    promise: 'Draft, approve, send, sign, and archive client-ready documents.',
    groups: [
      ['Proposal studio', ['Agency-branded proposal identity and logo', 'Client, company, project, and contact details', 'Narrative for outcomes, boundaries, and delivery plan', 'Multiple priced services with duration and description', 'Tax, payment phases, terms, and next steps', 'Secure preview and PDF download']],
      ['Proforma attachment', ['Attach an existing lead proforma', 'Create a new proforma from proposal services', 'Prefilled but editable customer and billing details', 'Add invoice-only line items', 'Save and link without a separate email']],
      ['Contract and SOW editor', ['Professional Services Agreement and Statement of Work formats', 'Brand identity, commencement, and term', 'Service, commercial, risk, and legal clauses', 'Project engagement, dates, fee, currency, and tax', 'Deliverables, milestones, targets, and outputs', 'Authorized acceptance block and PDF preview']],
      ['Governed document workflow', ['Simple editor or Atlas-created draft from an existing lead', 'Approval required before sending', 'Approval attribution to named reviewer', 'Final PDF and Word artifacts', 'Download PDF, Word, or combined ZIP', 'Secure recipient signing link', 'Typed legal-name consent, timestamp, and privacy-preserving audit', 'Agency countersignature and executed-document state']],
    ],
  },
  {
    title: 'Reporting & Visual Analytics', status: 'Available now', eyebrow: 'Decision support',
    promise: 'Turn verified workspace data into presentation-ready insight.',
    groups: [
      ['Report studio', ['Executive summary', 'Lead-pipeline breakdown', 'Marketing campaign and ad breakdown', 'Client portfolio/account breakdown', 'Project delivery and risk breakdown', 'Team capacity and ownership breakdown']],
      ['Agency-branded outputs', ['Three-page designed PDF for every generated report', 'Atlas overview and narrative', 'Primary granular table', 'Secondary detail and recommended actions', 'Client-scope selection', 'In-page PDF preview and download']],
      ['Report archive', ['Report title, scope, creation date, and page count', 'Refreshable archive', 'View and download historical reports', 'Verified workspace data and no-placeholder empty states']],
      ['Graph Explorer', ['Operational capacity vs monthly billings', 'Projected billings vs overhead', 'Client ROI, media spend, and attributed revenue', 'Configurable primary and secondary Y-axes', 'Time range and ordering controls', 'Growth/decline highlighting', 'Average, peak, valley, and cumulative summaries', 'Atlas graph assistant and live prediction context']],
    ],
  },
  {
    title: 'Atlas AI Command Center', status: 'Pro / Advanced', eyebrow: 'Embedded intelligence',
    promise: 'Ask questions, analyze operations, and safely execute work through conversation.',
    groups: [
      ['Conversational workspace', ['Secure Ask Atlas chat', 'Suggested queries and natural-language prompts', 'Persistent chat sessions and history', 'Delete saved chats', 'Context from clients, projects, team, leads, finance, and operations', 'Provider-aware token budgets and usage tracking']],
      ['Analysis capabilities', ['Dashboard executive summaries', 'Finance analysis and profit-leak detection', 'Forecast narratives', 'Operations advice and churn signals', 'Reporting briefs', 'Meta strategy using consented aggregate metrics', 'Creative recommendations in product-defined Design Hub flows']],
      ['Action automations', ['Create projects with commercial terms and deliverables', 'Create tasks with project, deadline, and assignee', 'Create tax or proforma invoices with line items', 'Create reports with type and focus', 'Ask follow-up questions for missing fields', 'Review a structured summary and confirm before execution', 'Decision delegation with rationale and evidence']],
      ['Meeting automation', ['Understand scheduling requests', 'Collect title, attendees, date, and time zone', 'Preview a 30-minute meeting', 'Require confirmation', 'Create Google Calendar event and Meet link', 'Send attendee invitations']],
    ],
  },
  {
    title: 'Daily Briefing & Strategy Studio', status: 'Advanced', eyebrow: 'Proactive intelligence',
    promise: 'Start with the next best action and turn account evidence into strategy.',
    groups: [
      ['Atlas daily briefing', ['Prioritized briefing cards', 'Handle-this-first recommendation', 'Revenue, project, lead, and task updates', 'Click-to-file an update and continue', 'Resume dashboard after completion', 'Floating Atlas launcher access']],
      ['Strategy types', ['Upsell strategy', 'Marketing strategy', 'Financial strategy', 'First-party client and project scope', 'Explicit exclusion of integrations, campaign feeds, invoices, and ledger entries from strategy inputs']],
      ['Strategy builder', ['Optional Atlas-generated strategy name', 'Timeline and end goal', 'Client and project selection', 'Audience or decision-maker', 'Budget, capacity, positioning, and risk constraints', 'Additional context and non-negotiables']],
      ['Strategy library', ['Generated strategy history', 'Saved output and model attribution', 'PDF export', 'Empty-state and scope transparency']],
    ],
  },
  {
    title: 'Calendar, Meetings & Reminders', status: 'Available now', eyebrow: 'Time coordination',
    promise: 'Coordinate internal and client commitments from a shared calendar hub.',
    groups: [
      ['Calendar hub', ['Monthly event calendar', 'Today navigation', 'Search by title, details, or guests', 'Filters for personal meetings, client consults, and Google events', 'Event detail view', 'No-event and sync states']],
      ['Event management', ['Create and edit event title, description, category, and color', 'Start/end dates and times', 'Location and guest emails', 'Daily or weekly recurrence', 'Delete events', 'Guest RSVP: accept or decline']],
      ['Google Calendar', ['Individual Google OAuth connection', 'Manual synchronization', 'Imported Google events', 'Google Meet link generation', 'Calendar invitation emails', 'Join Meet shortcuts']],
      ['Notifications and reminders', ['Notification center for updates, approvals, messages, delays, and reminders', 'Add reminders linked to dashboard, leads, tasks, clients, or calendar', 'Mark one or all notifications read', 'Dismiss individual notifications']],
    ],
  },
  {
    title: 'Secure Messaging', status: 'Pro / Advanced', eyebrow: 'Private collaboration',
    promise: 'Keep agency-client and agency-team conversations private by design.',
    groups: [
      ['Role-safe conversations', ['Agency owner can start conversations with clients and team members', 'Client and team accounts can message an agency owner', 'Conversation list and selection', 'Realtime message stream and delivery receipts']],
      ['End-to-end privacy', ['Message content encrypted before upload', 'Encryption keys remain on the user device', 'Server accepts ciphertext only', 'Registered device identities', 'Per-conversation membership controls']],
      ['Rich attachments', ['Images, GIFs, voice, video, documents, and archives', 'Multiple attachments per message', 'Plan-specific size and combined-upload limits', 'Encrypted attachment storage']],
      ['Everyday experience', ['Compose and send secure messages', 'File picker and attachment status', 'Decrypting and empty-conversation states', 'Unread notifications and cross-workspace access']],
    ],
  },
  {
    title: 'Meta Ads, Campaigns & Lead Routing', status: 'Available now with consent', eyebrow: 'Paid acquisition',
    promise: 'Monitor provider-backed Meta performance and route leads to the right workspace.',
    groups: [
      ['Connection and governance', ['Separate affirmative Meta access consent', 'Meta Login for Business authorization', 'Discover Business Portfolios, ad accounts, and manageable Pages', 'Select one or more authorized ad accounts', 'Subscribe Pages to lead notifications', 'Encrypted credential storage and connection audit logs']],
      ['Agency-owned acquisition', ['Dedicated agency ad-account assignment', 'Sync and last-sync status', 'Spend, impressions, reach, clicks, CTR, CPC, CPM, leads, and CPL', 'Campaign filter', 'Top Meta ads table', 'Instant Form leads with source ad, campaign, form, and WhatsApp action', 'Agency pipeline and export inclusion']],
      ['Client account isolation', ['Project-level Meta feature switch', 'One ad account assigned to one client', 'Exact account matching for campaigns and leads', 'Provider-synced data only; demo data excluded', 'Read-only campaign, ad, and insights access', 'Client-scoped lead and performance views']],
      ['Privacy and lifecycle controls', ['Independent Atlas Meta analytics consent', 'Atlas receives aggregate metrics only', 'Tokens and raw lead identity/form data excluded from Atlas', 'Consent withdrawal blocks future provider retrieval', 'Disconnect and provider deauthorization handling', 'Verified user-data deletion callback and confirmation code', 'Ignore lead webhooks after consent withdrawal']],
    ],
  },
  {
    title: 'Client Portal', status: 'Available now', eyebrow: 'Client experience',
    promise: 'Give each client a focused, secure view of delivery, approvals, and performance.',
    groups: [
      ['Scoped access', ['Invite-only account activation', 'Client-specific dashboard route', 'Strict organization, client, and ad-account data isolation', 'Agency branding and client-safe navigation', 'No access to admin commands or other client data']],
      ['Performance view', ['Meta spend, leads, CPL, CTR, campaign comparison, and active ads', 'Qualified lead directory with contact and source creative', 'Organic engagement and reach indicators', 'Optimal posting-time recommendations', 'Provider-backed Atlas strategy insights']],
      ['Content review', ['Monthly broadcast calendar', 'Published and scheduled content states', 'Broadcast queue and content inspector', 'Caption and creative preview', 'Approve post or request changes', 'Persisted feedback and revision flow']],
      ['Delivery collaboration', ['Project task progress and blockers', 'Lead specialist and latest update', 'Approve deliverables or request changes', 'Submit project-wide change requests', 'Meta lead view when account association exists']],
    ],
  },
  {
    title: 'Team Member Workspace', status: 'Available now', eyebrow: 'Specialist experience',
    promise: 'Give every specialist a clean command center for assigned work and handovers.',
    groups: [
      ['Personal command center', ['Assigned Kanban tasks', 'To-do, in-progress, blocked, and completed lanes', 'Drag-and-drop task status updates', 'Task progress and deadlines', 'Assigned meeting calendar and agenda']],
      ['Task execution', ['Task description, status, timeline, and deadline', 'Progress update log', 'Collaboration comments', 'Blocker notes', 'Deliverable/output URL']],
      ['Stage handover', ['Mark work complete and create successor handover', 'Choose successor specialist', 'Carry forward deliverable link', 'Add handover notes', 'Parent/current/next-stage chain']],
      ['Role safety', ['Member-only workspace', 'Project/task scope limited to assigned records', 'Calendar event and Google Meet access', 'Immediate access revocation after offboarding']],
    ],
  },
  {
    title: 'Workspace Administration & Security', status: 'Available now', eyebrow: 'Governance',
    promise: 'Control identity, branding, permissions, plans, data access, and integrations.',
    groups: [
      ['Organization profile', ['Organization and legal entity identity', 'Invoice logo and brand color', 'Address, GST/tax number, billing email, and currency', 'Currency lock after financial activity', 'Agency specialization management', 'Up to five configured Indian bank accounts']],
      ['Users and roles', ['Admin, sub-admin, member, and client roles', 'Page-level permissions for sub-admins', 'Active user and sub-admin counts', 'Plan-aware sub-admin entitlements', 'Offboard users with feedback and immediate access revocation', 'Primary-admin safety protections']],
      ['Privacy and preferences', ['Dark/light theme preference', 'Atlas data-sharing consent', 'Meta access consent', 'Separate aggregate Meta analytics consent', 'Profile and notification preferences', 'Consent timestamps and revocation behavior']],
      ['Integration controls', ['Connected-services directory and API sync health', 'Meta and Google connection states', 'Connect, refresh, sync, manage accounts, and disconnect actions', 'Provider audit logs and error states', 'Selected-account management', 'Multi-step safeguarded agency-data wipe']],
    ],
  },
  {
    title: 'Authentication, Onboarding & Plans', status: 'Available now', eyebrow: 'Workspace lifecycle',
    promise: 'Move securely from signup to a configured, plan-aware workspace.',
    groups: [
      ['Account access', ['Workspace signup with name, email, phone, and password', 'Google sign-in', 'Email/password login', 'Forgot-password email flow', 'Secure password reset', 'Client and member invitation activation']],
      ['Four-step onboarding', ['Agency registration and billing identity', 'Currency, specialization, address, bank, and contact setup', 'Basic, Pro, or Advanced plan selection', 'Terms and privacy acceptance', 'Optional Atlas and Meta consent choices', 'Billing details and payment step']],
      ['Plan-aware experience', ['Basic: core finance, delivery, 5 clients, and 2 team members', 'Pro: Atlas meetings/invoices, secure messaging, 15 clients, and 4 team members', 'Advanced: full Atlas actions, strategy, daily briefing, 30 clients, and 15 team members', 'In-app plan comparison and upgrade dialog', 'Administrator-only plan changes', 'Feature lock messaging and resource-limit enforcement']],
      ['Security foundations', ['Role-aware route navigation', 'Organization-scoped records', 'Encrypted integration secrets', 'Secure uploaded-file validation', 'Auditable document approvals and signatures', 'Privacy-preserving signature request audit']],
    ],
  },
  {
    title: 'Design Hub & Creative Operations', status: 'Product-defined roadmap', eyebrow: 'Creative platform',
    promise: 'Centralize creative production, brand governance, publishing, and performance.',
    groups: [
      ['Canva-powered workspace', ['Connect Canva account and import projects', 'Open and edit Canva designs', 'Recent designs and design library', 'Export PNG, JPG, and PDF', 'Content library and campaign asset organization', 'Canva Connect, Design Editing, Asset, Export, Autofill, and Webhook APIs']],
      ['Brand and asset management', ['Brand kits, logos, colors, and typography', 'Template library and dynamic autofill', 'Enterprise asset manager and bulk uploads', 'Multi-brand asset libraries', 'Campaign folders and metadata', 'White-labeled design portals']],
      ['Review and publishing', ['Team collaboration and comments', 'Approval queue and sign-off workflow', 'Scheduled publishing', 'Multi-channel social publishing', 'Content calendar', 'Enterprise publishing pipelines', 'Creative workflow automation']],
      ['Creative intelligence', ['Design and campaign performance dashboards', 'Engagement analytics and content ROI', 'Brand compliance checks and governance controls', 'Creative recommendations and layout grades', 'Content forecasting and performance benchmarking', 'Executive creative reports and Design API console']],
    ],
  },
  {
    title: 'Automation, Operations & Forecasting', status: 'Product-defined roadmap', eyebrow: 'Enterprise scale',
    promise: 'Automate repetitive work, expose bottlenecks, and model what happens next.',
    groups: [
      ['Workflow automation', ['Visual trigger-condition-action builder', 'Templates for reporting, invoice reminders, churn alerts, design approvals, publishing, project risk, and executive reports', 'Owner, status, preview, and approval steps', 'Run history with success, failure, skipped, and pending-approval states', 'Retry and error queue', 'Atlas automation-opportunity recommendations']],
      ['Operations control', ['Cross-team work queue', 'Client requests, design approvals, report reviews, project escalations, and finance approvals', 'SLA risk and blocked-work monitoring', 'Process health and throughput', 'Delivery oversight and internal requests', 'Atlas bottleneck detection']],
      ['Enterprise forecasting', ['Revenue and cash-flow forecasts', 'Team-capacity and hiring forecasts', 'Client-churn forecast', 'Content-performance and agency-growth forecasts', 'Base, optimistic, and conservative scenarios', 'Assumptions, confidence, and variance']],
      ['Scenario planner', ['Pipeline conversion controls', 'Churn assumptions', 'Hiring and capacity inputs', 'Project-load scenarios', 'Campaign-performance inputs', 'Atlas explanation of risks, assumptions, and recommended actions']],
    ],
  },
  {
    title: 'Expanded Intelligence & Integration Ecosystem', status: 'Product-defined roadmap', eyebrow: 'Connected intelligence',
    promise: 'Extend Iris OS across the full agency technology stack.',
    groups: [
      ['Client intelligence', ['Client health and profitability scores', 'Churn prediction and renewal intelligence', 'Upsell opportunity detection', 'Client ROI analysis', 'Explainable score drivers and recommended actions']],
      ['Team and project intelligence', ['Capacity forecasting and overloaded-role detection', 'Hiring recommendations', 'Productivity and performance insights', 'Project risk detection', 'Resource recommendations and timeline optimization']],
      ['Executive intelligence', ['Agency Health Score', 'Opportunity detection', 'Profit-leak detection', 'Automated executive summaries', 'Strategic recommendations', 'Enterprise creative intelligence']],
      ['Provider ecosystem', ['Canva and social publishing', 'Accounting and payment platforms', 'CRM and client-data systems', 'Analytics and performance systems', 'AI/model providers', 'Connection states, sync logs, webhooks, credentials, and retryable failures']],
    ],
  },
];

const escape = (value) => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function splitFeature(feature) {
  const chunks = [];
  let current = [];
  let weight = 0;
  for (const group of feature.groups) {
    const groupWeight = group[1].length + 2;
    if (current.length && weight + groupWeight > 42) {
      chunks.push(current); current = []; weight = 0;
    }
    current.push(group); weight += groupWeight;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

const featurePages = featureSets.flatMap((feature, index) => splitFeature(feature).map((groups, partIndex, chunks) => ({ feature, groups, index, partIndex, partCount: chunks.length })));
let pageNo = 1;
const pages = [];
function page(content, cls='') {
  const n = pageNo++;
  pages.push(`<section class="page ${cls}">${content}<footer><span>IRIS OS / END-USER FEATURE CATALOG</span><span>${String(n).padStart(2,'0')}</span></footer></section>`);
}

page(`<div class="cover-grid"><div class="brand"><img src="data:image/png;base64,${logo}" alt="Iris OS"><span>PRODUCT CATALOG / 2026</span></div><div class="cover-copy"><p class="kicker">THE OPERATING SYSTEM FOR MODERN AGENCIES</p><h1>Every end-user feature.<br><em>One connected workspace.</em></h1><p class="lede">A landing-page-ready catalog of the complete Iris OS product surface - current application capabilities, role-based experiences, plan gates, and product-defined expansion features.</p></div><div class="cover-meta"><div><b>${featureSets.length}</b><span>feature sets</span></div><div><b>${featureSets.reduce((s,f)=>s+f.groups.reduce((x,g)=>x+g[1].length,0),0)}+</b><span>sub-features</span></div><div><b>3</b><span>workspace roles</span></div></div></div>`, 'cover');

page(`<div class="page-head"><span class="section-num">00</span><div><p class="eyebrow">About this catalog</p><h2>Built from the entire project surface</h2></div></div><div class="intro-grid"><article class="lead-card"><h3>Purpose</h3><p>This document converts the product code, user flows, schema, API capabilities, plan rules, user manual, and product plans into language that can be used on a marketing landing page.</p></article><article><h3>Availability labels</h3><ul><li><b>Available now</b> - present in the live application code.</li><li><b>Pro / Advanced</b> - implemented and plan-gated.</li><li><b>Available now with consent</b> - implemented but dependent on explicit permissions and a provider connection.</li><li><b>Product-defined roadmap</b> - specified in project plans or underlying adapters, but not exposed as a complete live module.</li></ul></article><article><h3>Copy guidance</h3><p>Use the feature-set titles as landing-page sections, the one-line promises as section headlines, and the nested bullets as benefit or capability cards.</p></article><article><h3>Product language</h3><p>The current application brand is <b>Iris OS</b>. Atlas AI is the embedded intelligence layer. Older planning files use CrystalOS/Prisma terminology; this catalog normalizes those references to the current brand where the intended capability is equivalent.</p></article></div>`);

const tocItems = featureSets.map((f,i)=>`<li><span>${String(i+1).padStart(2,'0')}</span><div><b>${escape(f.title)}</b><small>${escape(f.eyebrow)} · ${escape(f.status)}</small></div></li>`);
page(`<div class="page-head"><span class="section-num">01</span><div><p class="eyebrow">Contents</p><h2>Product feature map</h2></div></div><ol class="toc">${tocItems.slice(0,11).join('')}</ol>`);
page(`<div class="page-head"><span class="section-num">01</span><div><p class="eyebrow">Contents continued</p><h2>Product feature map</h2></div></div><ol class="toc" start="12">${tocItems.slice(11).join('')}</ol>`);

for (const item of featurePages) {
  const { feature, groups, index, partIndex, partCount } = item;
  const cards = groups.map(([name, bullets]) => `<article class="feature-card"><h3>${escape(name)}</h3><ul>${bullets.map(b=>`<li>${escape(b)}</li>`).join('')}</ul></article>`).join('');
  page(`<div class="page-head"><span class="section-num">${String(index+1).padStart(2,'0')}</span><div><p class="eyebrow">${escape(feature.eyebrow)}${partCount>1?` · Part ${partIndex+1}`:''}</p><h2>${escape(feature.title)}</h2><span class="status ${feature.status.toLowerCase().includes('roadmap')?'roadmap':''}">${escape(feature.status)}</span></div></div>${partIndex===0?`<p class="promise">${escape(feature.promise)}</p>`:''}<div class="feature-grid">${cards}</div>`);
}

page(`<div class="page-head"><span class="section-num">A</span><div><p class="eyebrow">Access model</p><h2>Roles and plan boundaries</h2></div></div><div class="matrix"><div class="matrix-head"><span>Audience</span><span>Primary experience</span><span>Key boundaries</span></div><div><b>Agency administrator</b><span>Full command center, leads, clients, finance, documents, delivery, intelligence, settings</span><span>Controls plans, consent, integrations, users, billing identity, and destructive data actions</span></div><div><b>Sub-admin</b><span>Administrator modules selected by page-level permissions</span><span>Cannot exceed assigned navigation access</span></div><div><b>Team member</b><span>Personal task Kanban, handovers, calendar, comments, secure messaging</span><span>Assigned work only; no administrative or client-finance access</span></div><div><b>Client</b><span>Performance, content approvals, tasks, deliverables, change requests, leads, messaging</span><span>Strictly scoped to one client and its associated Meta account</span></div></div><div class="plan-grid"><article><h3>Basic · $99/mo</h3><p>Core finance, delivery, 5 clients, 2 team members, and all ten specializations.</p></article><article><h3>Pro · $299/mo</h3><p>15 clients, 4 team members, Atlas for meetings and invoices, AI features, and secure messaging.</p></article><article><h3>Advanced · $599/mo</h3><p>30 clients, 15 team members, full Atlas actions, strategy, daily briefing, and signed-document automation.</p></article></div>`);

page(`<div class="page-head"><span class="section-num">B</span><div><p class="eyebrow">Landing-page architecture</p><h2>Recommended feature story</h2></div></div><div class="story"><article><span>01</span><h3>Lead with the unified OS</h3><p>Agency Command Center + finance + clients + projects. Show the executive view before individual tools.</p></article><article><span>02</span><h3>Prove connected workflows</h3><p>Trace one journey: lead → proposal → client → project → task → deliverable → invoice → report.</p></article><article><span>03</span><h3>Differentiate with Atlas</h3><p>Pair insight with action: analyze the workspace, confirm a structured plan, and create real work.</p></article><article><span>04</span><h3>Show role-specific value</h3><p>Give agency owners, specialists, and clients separate feature cards and screenshots.</p></article><article><span>05</span><h3>Build trust with governance</h3><p>Highlight scoped access, consent gates, encrypted messaging, e-sign audit, and provider-backed data.</p></article><article><span>06</span><h3>Close with extensibility</h3><p>Position Design Hub, automation, forecasting, and the integration ecosystem as the enterprise expansion story.</p></article></div>`);

page(`<div class="page-head"><span class="section-num">C</span><div><p class="eyebrow">Source and accuracy note</p><h2>How completeness was established</h2></div></div><div class="source-note"><p>The catalog was compiled from the current authenticated and public routes, shared end-user components, API action families, Prisma data model, plan-entitlement rules, the updated Meta tester manual, README, feature directory, and product/architecture plans.</p><h3>Important publishing distinction</h3><p>Features labeled <b>Product-defined roadmap</b> should be described as upcoming, extensible, or part of the product vision until the corresponding complete module is exposed in the live navigation. Current capabilities can be marketed as available, subject to the role, plan, consent, and provider requirements noted here.</p><h3>Recommended proof assets</h3><ul><li>Command Center dashboard and role-aware navigation</li><li>Agency lead Kanban and client onboarding flow</li><li>Project breakdown, task handover, and client approval workflow</li><li>Invoice/proposal PDF and secure e-sign flow</li><li>Atlas confirmation card creating a real project, invoice, report, or meeting</li><li>Meta consent, account selection, and provider-synced performance</li></ul></div><div class="closing">Iris OS brings the commercial, operational, collaborative, and intelligence layers of an agency into one governed system.</div>`);

const css = `
@font-face{font-family:Clash;src:url('file:///${path.join(root,'public/fonts/ClashDisplay-Semibold.otf').replace(/\\/g,'/')}')}@font-face{font-family:Sansation;src:url('file:///${path.join(root,'public/fonts/Sansation-Regular.ttf').replace(/\\/g,'/')}')}@font-face{font-family:Sansation;src:url('file:///${path.join(root,'public/fonts/Sansation-Bold.ttf').replace(/\\/g,'/')}');font-weight:700}
*{box-sizing:border-box}html,body{margin:0;background:#101114;color:#f4f4f5;font-family:Sansation,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{counter-reset:page}.page{position:relative;width:8.5in;height:11in;overflow:hidden;padding:.56in .62in .55in;background:radial-gradient(circle at 92% 4%,rgba(255,255,255,.06),transparent 24%),linear-gradient(145deg,#0b0c0f,#14161b 58%,#0d0e11);page-break-after:always}.page:before{content:"";position:absolute;inset:13px;border:1px solid rgba(255,255,255,.055);pointer-events:none}.page footer{position:absolute;left:.62in;right:.62in;bottom:.27in;display:flex;justify-content:space-between;color:#71717a;font-size:8px;letter-spacing:.15em}.cover{padding:.5in}.cover-grid{height:100%;display:grid;grid-template-rows:auto 1fr auto}.brand{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #31333a;padding-bottom:18px}.brand img{width:120px;height:40px;object-fit:contain;object-position:left center}.brand span,.kicker,.eyebrow{font-size:8.5px;letter-spacing:.22em;text-transform:uppercase;color:#a1a1aa;font-weight:700}.cover-copy{align-self:center;max-width:690px}.cover h1{font-family:Clash,Arial,sans-serif;font-size:51px;line-height:1.01;letter-spacing:-.035em;margin:14px 0 22px}.cover h1 em{font-style:normal;color:#aeb2ba}.lede{font-size:16px;line-height:1.5;color:#c4c5ca;max-width:620px}.cover-meta{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #31333a;padding-top:20px;margin-bottom:30px}.cover-meta div{display:flex;flex-direction:column;border-right:1px solid #31333a;padding-left:18px}.cover-meta div:first-child{padding-left:0}.cover-meta div:last-child{border:0}.cover-meta b{font-family:Clash;font-size:26px}.cover-meta span{color:#8f929a;font-size:10px;text-transform:uppercase;letter-spacing:.13em}.page-head{display:grid;grid-template-columns:46px 1fr;gap:16px;align-items:start;border-bottom:1px solid #30323a;padding-bottom:15px;margin-bottom:18px}.section-num{font-family:Clash;color:#777b84;font-size:20px}.page h2{font-family:Clash;font-size:27px;line-height:1.08;margin:5px 0 0;letter-spacing:-.02em}.promise{font-size:14px;color:#c4c5ca;line-height:1.45;margin:0 0 19px 62px;max-width:610px}.status{display:inline-block;margin-top:9px;border:1px solid #4b4f58;border-radius:999px;padding:4px 8px;font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:#d7d8dc}.status.roadmap{border-style:dashed;color:#a7a8ae}.feature-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.feature-card,.intro-grid article,.plan-grid article{border:1px solid #30323a;background:rgba(255,255,255,.022);padding:16px 17px;break-inside:avoid}.feature-card h3,.intro-grid h3,.plan-grid h3,.source-note h3{font-family:Clash;font-size:14px;margin:0 0 10px;color:#f3f4f6}.feature-card ul,.intro-grid ul,.source-note ul{list-style:none;padding:0;margin:0}.feature-card li,.intro-grid li,.source-note li{position:relative;padding-left:13px;margin:0 0 6px;color:#b6b8c0;font-size:9.5px;line-height:1.37}.feature-card li:before,.intro-grid li:before,.source-note li:before{content:"";position:absolute;left:0;top:5px;width:4px;height:4px;background:#8d919a;border-radius:50%}.intro-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}.intro-grid article{min-height:175px}.intro-grid p,.source-note p{font-size:11px;line-height:1.55;color:#b9bbc2;margin:0}.lead-card{background:linear-gradient(145deg,rgba(255,255,255,.065),rgba(255,255,255,.015))!important}.toc{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr;column-gap:34px}.toc li{display:grid;grid-template-columns:30px 1fr;gap:10px;border-bottom:1px solid #292b32;padding:12px 0}.toc li>span{font-family:Clash;color:#737780;font-size:12px}.toc b{font-size:11px}.toc small{display:block;color:#747780;font-size:8px;margin-top:3px;text-transform:uppercase;letter-spacing:.08em}.matrix{border:1px solid #30323a}.matrix>div{display:grid;grid-template-columns:1.05fr 2fr 1.9fr}.matrix>div>*{padding:10px 12px;border-right:1px solid #30323a;font-size:9px;line-height:1.38}.matrix>div>*:last-child{border-right:0}.matrix>div+div{border-top:1px solid #30323a}.matrix-head{background:#1d1f25;color:#9da0a8;text-transform:uppercase;letter-spacing:.12em}.plan-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:18px}.plan-grid article{min-height:130px}.plan-grid p{color:#aeb0b7;font-size:9.5px;line-height:1.45}.story{display:grid;grid-template-columns:1fr 1fr;gap:14px}.story article{border-top:1px solid #4b4f58;padding:14px 8px 16px 0}.story article>span{font-family:Clash;color:#777b84;font-size:11px}.story h3{font-family:Clash;font-size:15px;margin:8px 0}.story p{font-size:10px;line-height:1.48;color:#aeb0b7;margin:0}.source-note{max-width:650px;margin-left:62px}.source-note h3{margin-top:22px}.closing{position:absolute;left:.62in;right:.62in;bottom:.68in;border-top:1px solid #4b4f58;padding-top:18px;font-family:Clash;font-size:18px;line-height:1.3;color:#d6d7da}
@page{size:Letter;margin:0}@media print{html,body{background:#fff}.page{margin:0}}
`;
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Iris OS End-User Feature Catalog</title><style>${css}</style></head><body>${pages.join('')}</body></html>`;
fs.writeFileSync(outputHtml, html);

(async()=>{
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 1 });
  await page.goto('file:///' + outputHtml.replace(/\\/g,'/'), { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  const nodes = page.locator('.page');
  const count = await nodes.count();
  for (let i=0;i<count;i++) await nodes.nth(i).screenshot({ path: path.join(qaDir, `page-${String(i+1).padStart(2,'0')}.png`) });
  await page.pdf({ path: outputPdf, format: 'Letter', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 }, preferCSSPageSize: true });
  const metrics = await page.evaluate(() => [...document.querySelectorAll('.page')].map((el,i)=>({page:i+1, scrollHeight:el.scrollHeight, clientHeight:el.clientHeight, scrollWidth:el.scrollWidth, clientWidth:el.clientWidth})));
  fs.writeFileSync(path.join(qaDir,'layout-metrics.json'), JSON.stringify(metrics,null,2));
  await browser.close();
  console.log(JSON.stringify({ outputPdf, outputHtml, pages: count, metrics }, null, 2));
})().catch(err=>{console.error(err);process.exit(1)});

import { planIncludes } from './plan-entitlements';
import { canRenderWorkspaceRoute } from './workspace-route-authorization';

export const WORKSPACE_QUICK_TOUR_EVENT = 'iris:workspace-quick-tour';
export const WORKSPACE_TOUR_CENTER_EVENT = 'iris:workspace-tour-center';
export const WORKSPACE_ONBOARDING_TOUR_PENDING_KEY = 'iris:onboarding-dashboard-tour';
export const WORKSPACE_CLIENT_ONBOARDING_PREVIEW_EVENT = 'iris:client-onboarding-preview';
export const WORKSPACE_AGENCY_LEADS_PREVIEW_EVENT = 'iris:agency-leads-preview';
export const WORKSPACE_FINANCE_PREVIEW_EVENT = 'iris:finance-preview';
export const WORKSPACE_PROJECTS_PREVIEW_EVENT = 'iris:projects-preview';
export const WORKSPACE_INVOICES_PREVIEW_EVENT = 'iris:invoices-preview';
export const WORKSPACE_TASKS_PREVIEW_EVENT = 'iris:tasks-preview';
export const WORKSPACE_TEAM_PREVIEW_EVENT = 'iris:team-preview';
export const WORKSPACE_DOCUMENT_PREVIEW_EVENT = 'iris:document-preview';
export const WORKSPACE_SETTINGS_PREVIEW_EVENT = 'iris:settings-preview';

export type WalkthroughAction = 'explain' | 'click' | 'input' | 'select' | 'drag' | 'navigate' | 'wait';
export type WalkthroughAdvance = 'next' | 'click' | 'input' | 'change' | 'submit' | 'route-change' | 'custom';
export type WorkspaceTourEvent = { event: string; detail?: unknown };

export type WorkspaceTourStep = {
  id: string;
  target: string;
  title: string;
  description: string;
  tip: string;
  action: WalkthroughAction;
  advanceOn?: WalkthroughAdvance;
  optional?: boolean;
  route?: string;
  preview?: WorkspaceTourEvent;
};

export type WorkspaceTour = {
  id: string;
  route: string;
  pageName: string;
  category: 'Getting Started' | 'Finance' | 'Sales' | 'Team & Productivity' | 'Documents' | 'AI';
  summary: string;
  steps: WorkspaceTourStep[];
  returnRoute?: string;
  returnPreview?: WorkspaceTourEvent;
};

export type WorkspaceTourAccess = {
  role: string;
  plan: string;
  accessPermissions?: string[] | null;
  deliveryWorkspace?: boolean;
};

type StepOptions = { action?: WalkthroughAction; advanceOn?: WalkthroughAdvance; route?: string; preview?: WorkspaceTourEvent };
const s = (id: string, target: string, title: string, description: string, tip: string, options: StepOptions = {}): WorkspaceTourStep => ({ id, target, title, description, tip, action: options.action || 'explain', advanceOn: options.advanceOn || 'next', route: options.route, preview: options.preview });
const clientPreview = (step: 1 | 2 | 3): WorkspaceTourEvent => ({ event: WORKSPACE_CLIENT_ONBOARDING_PREVIEW_EVENT, detail: { step } });
const leadsPreview = (tab: 'pipeline' | 'entry' | 'meta'): WorkspaceTourEvent => ({ event: WORKSPACE_AGENCY_LEADS_PREVIEW_EVENT, detail: { tab } });
const financePreview = (tab: 'overview' | 'manual'): WorkspaceTourEvent => ({ event: WORKSPACE_FINANCE_PREVIEW_EVENT, detail: { tab } });
const projectsPreview = (view: 'overview' | 'create'): WorkspaceTourEvent => ({ event: WORKSPACE_PROJECTS_PREVIEW_EVENT, detail: { view } });
const invoicesPreview = (tab: 'OVERVIEW' | 'TAX' | 'PROFORMA'): WorkspaceTourEvent => ({ event: WORKSPACE_INVOICES_PREVIEW_EVENT, detail: { tab } });
const tasksPreview = (view: 'overview' | 'create' | 'detail' | 'edit'): WorkspaceTourEvent => ({ event: WORKSPACE_TASKS_PREVIEW_EVENT, detail: { view } });
const teamPreview = (view: 'overview' | 'add'): WorkspaceTourEvent => ({ event: WORKSPACE_TEAM_PREVIEW_EVENT, detail: { view } });
const documentPreview = (family: 'PROPOSAL' | 'LEGAL', view: 'list' | 'editor'): WorkspaceTourEvent => ({ event: WORKSPACE_DOCUMENT_PREVIEW_EVENT, detail: { family, view } });
const settingsPreview = (tab: 'profile' | 'billing' | 'integrations'): WorkspaceTourEvent => ({ event: WORKSPACE_SETTINGS_PREVIEW_EVENT, detail: { tab } });

export const WORKSPACE_TOURS: WorkspaceTour[] = [
  { id: 'dashboard-orientation', route: '/dashboard', pageName: 'Workspace overview', category: 'Getting Started', summary: 'See the health of your business and work.', steps: [
    s('header-miles', '[data-tour="header-miles"]', 'Ask Miles', 'Ask a quick question or open Miles voice chat from any page.', 'Include a client, project, or date when it helps.'),
    s('header-notifications', '[data-tour="header-notifications"]', 'Notifications', 'See updates that need your attention.', 'Clear important updates before starting new work.'),
    s('header-theme', '[data-tour="header-theme"]', 'Theme', 'Switch between the light and dark workspace themes.', 'Your choice is saved for this workspace.'),
    s('header-search', '[data-tour="header-search"]', 'Workspace search', 'Find and open any workspace page quickly.', 'Use Ctrl+K to open search from the keyboard.'),
    s('dashboard-period', '[data-tour="dashboard-date-range"]', 'Choose a time period', 'Change the dates for every number on this page.', 'Use the same dates when you compare results.'),
    s('dashboard-overview', '[data-tour="dashboard-overview"]', 'Money and delivery', 'See income, costs, profit, projects, and tasks together.', 'Look for overdue work and unusual changes first.'),
    s('workspace-overview', '[data-tour="workspace-overview"]', 'Workspace overview', 'Switch tabs to see leads, clients, tasks, and meetings.', 'Use this card for a quick daily check.'),
    s('dashboard-sales-pipeline', '[data-tour="dashboard-sales-pipeline"]', 'Sales pipeline', 'See lead volume, win rate, lead cost, and ad return.', 'A falling win rate can point to weak follow-up.'),
    s('dashboard-client', '[data-tour="add-client"]', 'Add a client', 'Start the client and project setup here.', 'Complete billing details early to make invoicing easier.'),
  ] },
  { id: 'add-client', route: '/clients', pageName: 'Add a client', category: 'Getting Started', summary: 'See the full client setup before you begin.', returnRoute: '/clients/onboard', returnPreview: clientPreview(1), steps: [
    s('clients-overview', '[data-tour="clients-overview"]', 'Clients overview', 'See every client, their projects, assigned team, and contract value.', 'Open a client row to see its full workspace.'),
    s('add-client', '[data-tour="add-client"]', 'Add a client', 'Open the setup for a new client.', 'Use one record for each client company.'),
    s('client-form', '[data-tour="client-form"]', 'Client details', 'Add the company and main contact here.', 'Required fields stay untouched during this preview.', { route: '/clients/onboard', preview: clientPreview(1) }),
    s('client-project', '[data-tour="client-project-preview"]', 'First project', 'Set up the first project for this client.', 'The sample values are only for this tour.', { route: '/clients/onboard', preview: clientPreview(2) }),
    s('client-project-payment', '[data-tour="client-project-payment"]', 'Project amount', 'Choose recurring or one-time, then enter the client amount.', 'Recurring projects also need a billing frequency.', { route: '/clients/onboard', preview: clientPreview(2) }),
    s('client-project-budget', '[data-tour="client-project-budget"]', 'Internal budget', 'Set the amount your team can spend to deliver the project.', 'Keep this separate from the amount charged to the client.', { route: '/clients/onboard', preview: clientPreview(2) }),
    s('client-project-stages', '[data-tour="client-project-stages"]', 'Project stages', 'Set the main phases that work will move through.', 'Use short stage names that match your process.', { route: '/clients/onboard', preview: clientPreview(2) }),
    s('client-project-task', '[data-tour="client-project-task"]', 'First project task', 'Add a starter task, its stage, and due date.', 'You can add more tasks after the client is created.', { route: '/clients/onboard', preview: clientPreview(2) }),
    s('client-review', '[data-tour="client-review-preview"]', 'Check the details', 'Review everything before creating the client.', 'Done returns you to the required client fields.', { route: '/clients/onboard', preview: clientPreview(3) }),
  ] },
  { id: 'client-onboarding', route: '/clients/onboard', pageName: 'Onboard a client', category: 'Getting Started', summary: 'Preview all three setup pages safely.', returnRoute: '/clients/onboard', returnPreview: clientPreview(1), steps: [
    s('client-form', '[data-tour="client-form"]', 'Client details', 'Add the company and main contact here.', 'These fields must be complete before you create the client.', { preview: clientPreview(1) }),
    s('client-project', '[data-tour="client-project-preview"]', 'First project', 'Set up the first project for this client.', 'The sample values are only for this tour.', { preview: clientPreview(2) }),
    s('client-project-payment', '[data-tour="client-project-payment"]', 'Project amount', 'Choose recurring or one-time, then enter the client amount.', 'Recurring projects also need a billing frequency.', { preview: clientPreview(2) }),
    s('client-project-budget', '[data-tour="client-project-budget"]', 'Internal budget', 'Set the amount your team can spend to deliver the project.', 'Keep this separate from the amount charged to the client.', { preview: clientPreview(2) }),
    s('client-project-stages', '[data-tour="client-project-stages"]', 'Project stages', 'Set the main phases that work will move through.', 'Use short stage names that match your process.', { preview: clientPreview(2) }),
    s('client-project-task', '[data-tour="client-project-task"]', 'First project task', 'Add a starter task, its stage, and due date.', 'You can add more tasks after the client is created.', { preview: clientPreview(2) }),
    s('client-review', '[data-tour="client-review-preview"]', 'Check the details', 'Review everything before creating the client.', 'Done returns you to the first page.', { preview: clientPreview(3) }),
  ] },
  { id: 'create-project', route: '/projects', pageName: 'Create a project', category: 'Getting Started', summary: 'Set up work, stages, dates, and owners.', returnPreview: projectsPreview('overview'), steps: [
    s('projects-overview', '[data-tour="projects-overview"]', 'Projects overview', 'See active projects, contract value, delays, and client work.', 'Open a client card to see its projects.', { preview: projectsPreview('overview') }),
    s('create-project', '[data-tour="create-project"]', 'Create a project', 'Start a new project for a client.', 'Use a clear name that the client will recognize.', { preview: projectsPreview('overview') }),
    s('project-form', '[data-tour="project-form"]', 'Project details', 'Choose the client, name, specialization, and dates.', 'Choose dates the team can meet.', { preview: projectsPreview('create') }),
    s('project-payment', '[data-tour="project-payment"]', 'Project amount', 'Choose recurring or one-time, then enter the client amount.', 'Recurring projects also need a billing frequency.', { preview: projectsPreview('create') }),
    s('project-budget', '[data-tour="project-budget"]', 'Internal budget', 'Set the amount your team can spend to deliver the project.', 'Keep this separate from the client amount.', { preview: projectsPreview('create') }),
    s('project-stages', '[data-tour="project-stages"]', 'Project stages', 'Set the main phases that work will move through.', 'Use stages for major handoffs.', { preview: projectsPreview('create') }),
    s('project-task', '[data-tour="project-task"]', 'First project task', 'Add a starter task, choose its stage, and set a due date.', 'You can add more tasks after saving.', { preview: projectsPreview('create') }),
    s('save-project', '[data-tour="save-project"]', 'Save the project', 'Create the project when the details are ready.', 'Check the client amount and internal budget first.', { preview: projectsPreview('create') }),
  ] },
  { id: 'manage-tasks', route: '/tasks', pageName: 'Manage tasks', category: 'Getting Started', summary: 'Create, assign, edit, and track work.', returnPreview: tasksPreview('overview'), steps: [
    s('task-workspace', '[data-tour="task-workspace"]', 'Tasks overview', 'See work as a board or list, then filter it by project or stage.', 'Keep task status matched to the real work.', { preview: tasksPreview('overview') }),
    s('task-controls', '[data-tour="task-controls"]', 'Choose the task view', 'Pick a project, then switch between board and list views.', 'Choose one project to group work by project stage.', { preview: tasksPreview('overview') }),
    s('add-task', '[data-tour="add-task"]', 'Create a task', 'Next opens the task form.', 'Select a project before creating project work.', { preview: tasksPreview('overview') }),
    s('task-create-basics', '[data-tour="task-create-basics"]', 'Name and description', 'Enter the task name and explain the expected work.', 'Describe the output clearly enough for the assignee.', { preview: tasksPreview('create') }),
    s('task-create-routing', '[data-tour="task-create-routing"]', 'Stage, owner, and status', 'Choose its project stage, specialist, starting status, and client approval need.', 'Use client approval only when the client must review the output.', { preview: tasksPreview('create') }),
    s('task-create-schedule', '[data-tour="task-create-schedule"]', 'Timeline and deadline', 'Enter the estimated duration and the final due date.', 'The timeline is an estimate; the deadline is the calendar date.', { preview: tasksPreview('create') }),
    s('task-create-save', '[data-tour="task-create-save"]', 'Create the task', 'Save the task after checking its owner and deadline.', 'You can edit every detail later.', { preview: tasksPreview('create') }),
    s('task-detail', '[data-tour="task-detail"]', 'Task details', 'Open a task to see its owner, progress, stage, updates, comments, and deliverables.', 'Keep decisions and delivery links on the task.', { preview: tasksPreview('detail') }),
    s('task-edit', '[data-tour="task-edit-form"]', 'Edit a task', 'Change the name, description, status, progress, dates, owner, approval setting, or blocker.', 'Save progress and status together so they stay consistent.', { preview: tasksPreview('edit') }),
  ] },
  { id: 'record-finances', route: '/finance', pageName: 'Record finances', category: 'Finance', summary: 'Record money, import history, and check profit.', returnPreview: financePreview('overview'), steps: [
    s('finance-summary', '[data-tour="finance-summary"]', 'Check the totals', 'See revenue, costs, subscriptions, and profit.', 'Choose a card to open its detailed view.', { preview: financePreview('overview') }),
    s('add-transaction', '[data-tour="add-transaction"]', 'Open the ledger', 'Next opens the ledger entry page for you.', 'Use the ledger for received revenue and expenses.', { preview: financePreview('manual') }),
    s('transaction-form', '[data-tour="transaction-form"]', 'Add one transaction', 'Record one payment or expense here.', 'Link revenue to its invoice.', { preview: financePreview('manual') }),
    s('recurring-subscriptions', '[data-tour="recurring-subscriptions"]', 'Recurring subscriptions', 'Add repeating software, AI, and operating costs here.', 'Choose the right frequency and start date.', { preview: financePreview('manual') }),
    s('finance-bulk-import', '[data-tour="finance-bulk-import"]', 'Import many transactions', 'Download a template, fill it, and upload it here.', 'Use Historical Revenue when old revenue has no invoice yet.', { preview: financePreview('manual') }),
  ] },
  { id: 'create-invoice', route: '/invoices', pageName: 'Create an invoice', category: 'Finance', summary: 'Create tax and proforma invoices.', returnPreview: invoicesPreview('OVERVIEW'), steps: [
    s('create-invoice', '[data-tour="create-invoice"]', 'Tax invoice', 'Open the tax invoice form for an existing project.', 'Check the client billing profile first.', { preview: invoicesPreview('OVERVIEW') }),
    s('invoice-form', '[data-tour="invoice-form"]', 'Tax invoice details', 'Choose the project, add billable items, prices, tax, and terms.', 'Check the final total before creating it.', { preview: invoicesPreview('TAX') }),
    s('invoice-generate', '[data-tour="invoice-generate"]', 'Create the tax invoice', 'Create and send the completed tax invoice.', 'The PDF is regenerated from the saved invoice whenever it is downloaded.', { preview: invoicesPreview('TAX') }),
    s('proforma-tab', '[data-tour="create-proforma"]', 'Proforma invoice', 'Use a proforma as a quotation before work is invoiced.', 'A proforma does not count as received revenue.', { preview: invoicesPreview('PROFORMA') }),
    s('proforma-lead', '[data-tour="proforma-lead"]', 'Select a lead', 'Choose a business lead to fill their name, email, and phone automatically.', 'Update the lead record first if its contact details are wrong.', { preview: invoicesPreview('PROFORMA') }),
    s('proforma-details', '[data-tour="proforma-details"]', 'Quotation details', 'Add the proforma number, dates, title, description, and billing address.', 'The valid-until date tells the lead how long the quote applies.', { preview: invoicesPreview('PROFORMA') }),
    s('proforma-items', '[data-tour="proforma-items"]', 'Quotation items', 'List each service, quantity, unit price, and tax rate.', 'Use separate lines when services have different prices.', { preview: invoicesPreview('PROFORMA') }),
    s('proforma-generate', '[data-tour="proforma-generate"]', 'Create the proforma', 'Create and send the quotation to the selected lead.', 'Review the email and billing address first.', { preview: invoicesPreview('PROFORMA') }),
  ] },
  { id: 'sales-pipeline', route: '/agency-leads', pageName: 'Sales pipeline', category: 'Sales', summary: 'Add leads and connect Meta lead forms.', returnPreview: leadsPreview('pipeline'), steps: [
    s('pipeline-tab', '[data-tour="leads-pipeline-tab"]', 'Leads Pipeline', 'This tab shows every lead by sales stage.', 'Use it for your daily sales follow-up.', { preview: leadsPreview('pipeline') }),
    s('lead-pipeline', '[data-tour="lead-pipeline"]', 'Move leads forward', 'Drag a lead when its sales stage changes.', 'Set a next follow-up for every active lead.', { preview: leadsPreview('pipeline') }),
    s('add-lead-tab', '[data-tour="add-lead"]', 'Open Add Leads', 'Next opens the lead entry page for you.', 'You can add one lead or import a list.', { preview: leadsPreview('entry') }),
    s('add-lead', '[data-tour="add-lead-form"]', 'Add a lead', 'Enter the lead details in this form.', 'Include the source so you can compare channels.', { preview: leadsPreview('entry') }),
    s('lead-bulk-import', '[data-tour="lead-bulk-import"]', 'Import many leads', 'Download a template, fill it, and upload it here.', 'Review the staged rows before you confirm the import.', { preview: leadsPreview('entry') }),
    s('meta-tab', '[data-tour="meta-leads-tab"]', 'Open Meta Business', 'Next opens the Meta connection page for you.', 'Consent must be enabled in Settings first.', { preview: leadsPreview('meta') }),
    s('connect-meta', '[data-tour="connect-meta-leads"]', 'Connect Meta for leads', 'Bring Meta form leads and ad results into this pipeline.', 'Choose the correct business and lead forms.', { preview: leadsPreview('meta') }),
  ] },
  { id: 'add-team-member', route: '/team', pageName: 'Add a team member', category: 'Team & Productivity', summary: 'Invite a person and choose their workspace.', returnPreview: teamPreview('overview'), steps: [
    s('add-member', '[data-tour="add-team-member"]', 'Add a team member', 'Open the invite form.', 'Invite the work email they will use.', { preview: teamPreview('overview') }),
    s('member-form', '[data-tour="team-member-form"]', 'Member details and access', 'Enter their details and choose the pages they can use.', 'Give only the access they need.', { preview: teamPreview('add') }),
    s('handles-deliverables', '[data-tour="handles-deliverables"]', 'Handles deliverables', 'Enable this for the standard team dashboard with tasks, updates, calendar, and delivery tools.', 'Without it, the member only sees explicitly allowed pages or assigned project work.', { preview: teamPreview('add') }),
    s('member-projects', '[data-tour="member-projects"]', 'Assigned projects', 'Assigning a project gives the member a project-focused dashboard for that work.', 'Enable Handles Deliverables for the full delivery dashboard across their work.', { preview: teamPreview('add') }),
  ] },
  { id: 'schedule-meeting', route: '/calendar', pageName: 'Calendar', category: 'Team & Productivity', summary: 'Create events and connect Google Calendar.', steps: [
    s('calendar-view', '[data-tour="calendar-workspace"]', 'Your calendar', 'See meetings, calls, and deadlines in one place.', 'Use filters to focus on one event type.'),
    s('create-event', '[data-tour="create-event"]', 'Add an event', 'Create a meeting or call here.', 'Add guests and a meeting link before saving.'),
    s('calendar-connect', '[data-tour="calendar-connect"]', 'Connect Google Calendar', 'Sync your Google events and Meet links.', 'Use Sync Now after making changes elsewhere.'),
  ] },
  { id: 'create-proposal', route: '/proposals', pageName: 'Proposals', category: 'Documents', summary: 'Create a clear offer for a lead or client.', returnPreview: documentPreview('PROPOSAL', 'list'), steps: [
    s('proposal-form', '[data-tour="proposal-form"]', 'Proposal details', 'Add the client, scope, price, timeline, and terms.', 'Check every price and promise.', { preview: documentPreview('PROPOSAL', 'editor') }),
    s('proposal-generate', '[data-tour="proposal-generate"]', 'Create the proposal', 'Generate a preview and save the finished offer.', 'Read the preview before sharing it.', { preview: documentPreview('PROPOSAL', 'editor') }),
  ] },
  { id: 'create-contract', route: '/documents', pageName: 'Contracts', category: 'Documents', summary: 'Create and review an agreement.', returnPreview: documentPreview('LEGAL', 'list'), steps: [
    s('contract-form', '[data-tour="contract-form"]', 'Contract details', 'Add services, payment terms, and legal terms.', 'Check names and legal location.', { preview: documentPreview('LEGAL', 'editor') }),
    s('contract-generate', '[data-tour="contract-generate"]', 'Create the contract', 'Generate and review the full document.', 'Read it before sending or signing.', { preview: documentPreview('LEGAL', 'editor') }),
  ] },
  { id: 'meet-miles', route: '/atlas', pageName: 'Miles AI', category: 'AI', summary: 'Ask a question about your workspace.', steps: [
    s('miles-input', '[data-tour="miles-input"]', 'Ask Miles', 'Type a clear question about your business or work.', 'Add the client, project, or date range when useful.'),
    s('miles-transcribe', '[data-tour="miles-transcribe"]', 'Transcribe a message', 'Record one message and Miles will turn it into editable text.', 'Review the transcript before sending it.'),
    s('miles-voice-chat', '[data-tour="miles-voice-chat"]', 'Voice chat', 'Start a live conversation where Miles listens and replies by voice.', 'Pause naturally; Miles waits for a complete thought before replying.'),
    s('miles-send', '[data-tour="miles-send"]', 'Get an answer', 'Send the question to use the data you can access.', 'Check the source records before acting.'),
  ] },
  { id: 'client-dashboard', route: '/client-dashboard', pageName: 'Client workspace', category: 'Getting Started', summary: 'Find work that needs your review.', steps: [s('overview', '[data-tour="workspace-content"]', 'Your workspace', 'See projects, files, meetings, and approvals.', 'Start with items waiting for your decision.')] },
  { id: 'client-projects', route: '/client-projects', pageName: 'Client projects', category: 'Getting Started', summary: 'Follow project progress and tasks.', steps: [s('projects', '[data-tour="workspace-content"]', 'Project progress', 'Open a project to see dates, stages, and tasks.', 'Use Messages when you need more detail.')] },
  { id: 'client-documents', route: '/client-documents', pageName: 'Client documents', category: 'Documents', summary: 'Open, download, or sign a file.', steps: [s('documents', '[data-tour="workspace-content"]', 'Shared documents', 'Open the newest file before you download or sign it.', 'Check the version date first.')] },
  { id: 'client-deliverables', route: '/client-deliverables', pageName: 'Client deliverables', category: 'Team & Productivity', summary: 'Approve work or request changes.', steps: [s('deliverables', '[data-tour="workspace-content"]', 'Review the work', 'Approve a deliverable or leave clear changes.', 'Group related feedback in one note.')] },
  { id: 'team-workspace', route: '/teams-dashboard', pageName: 'Team workspace', category: 'Team & Productivity', summary: 'See and update assigned work.', steps: [s('tasks', '[data-tour="workspace-content"]', 'Your work', 'Open a task to update status and add context.', 'Update the status when the work changes.')] },
  { id: 'messages', route: '/messages', pageName: 'Messages', category: 'Team & Productivity', summary: 'Choose a chat and send an update.', steps: [
    s('message-list', '[data-tour="message-list"]', 'Choose a chat', 'Open the person or group you want to message.', 'Check the name before sharing client details.'),
    s('message-composer', '[data-tour="messages-workspace"]', 'Send a message', 'Open a chat, then write an update or attach a file.', 'Keep project decisions in the right chat.'),
  ] },
  { id: 'reporting', route: '/reporting', pageName: 'Reporting', category: 'Finance', summary: 'Build a report from current data.', steps: [
    s('reporting-form', '[data-tour="reporting-form"]', 'Choose the report', 'Pick the client, report type, and date range.', 'Update project and finance data first.'),
    s('reporting-generate', '[data-tour="reporting-generate"]', 'Create the report', 'Generate a report from the selected data.', 'Use the same dates when comparing reports.'),
    s('reporting-archive', '[data-tour="reporting-archive"]', 'View or download reports', 'Open any saved report in the preview or download its PDF.', 'Use the archive to find earlier versions.'),
  ] },
  { id: 'strategy', route: '/strategy', pageName: 'Strategy', category: 'AI', summary: 'Turn a goal into a simple plan.', steps: [
    s('strategy-form', '[data-tour="strategy-form"]', 'Describe the goal', 'Choose a plan type and add the goal, timing, and context.', 'Clear limits help Miles make a useful plan.'),
    s('strategy-generate', '[data-tour="strategy-generate"]', 'Build the plan', 'Ask Miles to create the first draft.', 'Review the numbers and assumptions.'),
    s('strategy-history', '[data-tour="strategy-history"]', 'View or download strategies', 'Choose a saved strategy to read it, then download its PDF.', 'The newest strategy appears at the top.'),
  ] },
  { id: 'settings', route: '/settings', pageName: 'Settings', category: 'Getting Started', summary: 'Manage your workspace, plan, access, and connections.', returnPreview: settingsPreview('profile'), steps: [
    s('settings-profile-tab', '[data-tour="settings-profile-tab"]', 'Profile and services', 'Manage your account, business profile, invoice identity, services, bank accounts, currency, and data permissions.', 'Save this section after changing organization details.', { preview: settingsPreview('profile') }),
    s('settings-profile', '[data-tour="settings-profile"]', 'Workspace profile', 'These settings control how your business appears across invoices, client areas, and workspace records.', 'Keep legal and billing details accurate for invoices.', { preview: settingsPreview('profile') }),
    s('settings-security', '[data-tour="settings-security"]', 'Security and roles', 'Open this section to manage users, credentials, roles, and page access.', 'Give each person only the access their work requires.', { preview: settingsPreview('profile') }),
    s('settings-billing-tab', '[data-tour="settings-billing-tab"]', 'Subscriptions and usage', 'Open this tab to review your plan and current workspace limits.', 'Check usage before adding more clients, projects, or team members.', { preview: settingsPreview('billing') }),
    s('settings-billing', '[data-tour="settings-billing"]', 'Plan usage', 'See plan capacity, Miles credits, invoices, data transfer, and upgrade options.', 'Usage counters show the current billing period.', { preview: settingsPreview('billing') }),
    s('settings-integrations-tab', '[data-tour="settings-integrations-tab"]', 'Integrations', 'Open this tab to connect services used by the workspace.', 'Only connect accounts owned by the correct business.', { preview: settingsPreview('integrations') }),
    s('settings-integrations', '[data-tour="settings-integrations"]', 'Connected services', 'Connect and manage Meta, Google, payments, and other available providers here.', 'Review permissions and account selection after connecting.', { preview: settingsPreview('integrations') }),
  ] },
];

export const TOUR_CATEGORIES = ['Getting Started', 'Finance', 'Sales', 'Team & Productivity', 'Documents', 'AI'] as const;

export function workspaceTourForPath(pathname: string) {
  return WORKSPACE_TOURS.filter((tour) => pathname === tour.route || pathname.startsWith(`${tour.route}/`)).sort((a, b) => b.route.length - a.route.length)[0] || null;
}

export function workspaceTourById(id: string) {
  return WORKSPACE_TOURS.find((tour) => tour.id === id) || null;
}

function canAccessTourRoute(access: WorkspaceTourAccess, route: string) {
  if (!canRenderWorkspaceRoute(access, route)) return false;
  if (route === '/strategy' && !planIncludes(access.plan, 'ADVANCED')) return false;
  if (route === '/atlas' && !planIncludes(access.plan, 'BASIC')) return false;
  return true;
}

const CLIENT_TOUR_IDS = new Set([
  'client-dashboard',
  'client-projects',
  'client-documents',
  'client-deliverables',
  'schedule-meeting',
  'messages',
]);

const MEMBER_TOUR_IDS = new Set([
  'team-workspace',
  'manage-tasks',
  'schedule-meeting',
  'messages',
]);

export function workspaceToursForAccess(access: WorkspaceTourAccess) {
  const role = access.role.toLowerCase();
  if (!['admin', 'sub_admin', 'member', 'client'].includes(role)) return [];

  return WORKSPACE_TOURS.flatMap((tour) => {
    if (role === 'client' && !CLIENT_TOUR_IDS.has(tour.id)) return [];
    if (role === 'member' && !MEMBER_TOUR_IDS.has(tour.id)) return [];
    if (!canAccessTourRoute(access, tour.route)) return [];

    // Personal profile settings remain available to clients and team members,
    // but this tour covers the agency settings console they cannot see.
    if (tour.id === 'settings' && role !== 'admin'
      && !(role === 'sub_admin' && (access.accessPermissions || []).includes('settings'))) return [];

    const steps = tour.steps.filter((step) => canAccessTourRoute(access, step.route || tour.route));
    if (!steps.length) return [];
    return [steps.length === tour.steps.length ? tour : { ...tour, steps }];
  });
}

import type { WorkspaceReadModel } from '@/lib/workspace-read-model';
import type { Dispatch, SetStateAction } from 'react';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const team = [
  { id: 'demo-team-1', name: 'Alex Morgan', email: 'alex@northstar.demo', role: 'admin', avatarUrl: null, skills: ['Strategy', 'Operations'] },
  { id: 'demo-team-2', name: 'Maya Chen', email: 'maya@northstar.demo', role: 'member', avatarUrl: null, skills: ['Brand', 'Design'] },
  { id: 'demo-team-3', name: 'Theo Brooks', email: 'theo@northstar.demo', role: 'member', avatarUrl: null, skills: ['Paid media', 'Analytics'] },
  { id: 'demo-team-4', name: 'Samira Patel', email: 'samira@northstar.demo', role: 'member', avatarUrl: null, skills: ['Content', 'SEO'] },
];

const clients = [
  { id: 'demo-client-nova', name: 'Nova Studio', status: 'ACTIVE', industry: 'Consumer technology', domain: 'novastudio.demo', contractValue: 240000, healthScore: 91, churnRisk: 'LOW', contacts: [{ id: 'contact-nova', name: 'Jordan Lee', email: 'jordan@nova.demo', phone: '+1 415 555 0112', role: 'Marketing Director' }], projects: [{ id: 'demo-project-nova', name: 'North America launch', status: 'IN_PROGRESS', progress: 72, paymentType: 'RETAINER', paymentFrequency: 'monthly', paymentAmount: 18000, members: [team[1], team[2]], assignedMembers: [team[1], team[2]] }] },
  { id: 'demo-client-arc', name: 'Arc & Co.', status: 'ACTIVE', industry: 'Hospitality', domain: 'arcandco.demo', contractValue: 180000, healthScore: 84, churnRisk: 'LOW', contacts: [{ id: 'contact-arc', name: 'Riley Shah', email: 'riley@arc.demo', phone: '+1 646 555 0134', role: 'Founder' }], projects: [{ id: 'demo-project-arc', name: 'Brand system rollout', status: 'IN_PROGRESS', progress: 58, paymentType: 'RETAINER', paymentFrequency: 'monthly', paymentAmount: 14500, members: [team[1], team[3]], assignedMembers: [team[1], team[3]] }] },
  { id: 'demo-client-kinetic', name: 'Kinetic Health', status: 'ACTIVE', industry: 'Health and wellness', domain: 'kinetic.demo', contractValue: 156000, healthScore: 67, churnRisk: 'MEDIUM', contacts: [{ id: 'contact-kinetic', name: 'Morgan Reed', email: 'morgan@kinetic.demo', phone: '+1 212 555 0168', role: 'Growth Lead' }], projects: [{ id: 'demo-project-kinetic', name: 'Member acquisition', status: 'OVERDUE', progress: 43, paymentType: 'RETAINER', paymentFrequency: 'monthly', paymentAmount: 12000, members: [team[2], team[3]], assignedMembers: [team[2], team[3]] }] },
  { id: 'demo-client-luma', name: 'Luma House', status: 'ACTIVE', industry: 'Architecture', domain: 'lumahouse.demo', contractValue: 96000, healthScore: 78, churnRisk: 'LOW', contacts: [{ id: 'contact-luma', name: 'Avery Wilson', email: 'avery@luma.demo', phone: '+1 310 555 0191', role: 'Principal' }], projects: [{ id: 'demo-project-luma', name: 'Editorial platform', status: 'IN_PROGRESS', progress: 81, paymentType: 'RETAINER', paymentFrequency: 'monthly', paymentAmount: 8500, members: [team[1]], assignedMembers: [team[1]] }] },
];

const tasks = [
  { id: 'demo-task-1', title: 'Approve launch media plan', status: 'IN_PROGRESS', progress: 64, deadline: '2026-09-27T12:00:00.000Z', projectId: 'demo-project-nova', project: { name: 'North America launch' } },
  { id: 'demo-task-2', title: 'Resolve attribution variance', status: 'TODO', progress: 10, deadline: '2026-09-28T12:00:00.000Z', projectId: 'demo-project-kinetic', project: { name: 'Member acquisition' } },
  { id: 'demo-task-3', title: 'Review brand governance deck', status: 'IN_PROGRESS', progress: 82, deadline: '2026-09-30T12:00:00.000Z', projectId: 'demo-project-arc', project: { name: 'Brand system rollout' } },
  { id: 'demo-task-4', title: 'Publish editorial release', status: 'TODO', progress: 36, deadline: '2026-10-02T12:00:00.000Z', projectId: 'demo-project-luma', project: { name: 'Editorial platform' } },
];

const projects = clients.flatMap((client, clientIndex) => client.projects.map((project, projectIndex) => ({
  ...project,
  clientId: client.id,
  client: { id: client.id, name: client.name },
  description: `${project.name} delivery workspace for ${client.name}.`,
  startDate: `2026-0${4 + clientIndex}-01T00:00:00.000Z`,
  endDate: `2026-${10 + projectIndex}-15T00:00:00.000Z`,
  budget: project.paymentAmount * 6,
  currency: 'USD',
  priority: clientIndex === 2 ? 'HIGH' : 'MEDIUM',
  stages: [{ id: `${project.id}-stage-1`, name: 'Delivery', order: 1 }],
  tasks: tasks.filter((task) => task.projectId === project.id),
})));

const reports = [
  { id: 'demo-report-1', title: 'September executive summary', type: 'EXECUTIVE', status: 'READY', client: 'Agency-wide', author: 'Alex Morgan', pageCount: 3, pdfUrl: null, date: 'Sep 26, 2026' },
  { id: 'demo-report-2', title: 'Nova Studio account report', type: 'CLIENTS', status: 'READY', client: 'Nova Studio', author: 'Alex Morgan', pageCount: 3, pdfUrl: null, date: 'Sep 22, 2026' },
];

const strategies = [
  { id: 'demo-strategy-1', type: 'FINANCIAL', title: 'Protect margin while scaling delivery', goal: 'Improve margin quality across active retainers.', timeline: 'Next 90 days', content: '## Executive direction\n\nPrioritize the Kinetic Health attribution decision, preserve Nova Studio capacity, and review software costs before the next planning cycle.', model: 'IrisOS demo intelligence', createdAt: '2026-09-24T10:00:00.000Z', createdBy: { name: 'Alex Morgan' } },
];

const messaging = {
  currentUserId: 'demo-user',
  currentUserRole: 'admin',
  plan: 'ADVANCED',
  limits: null,
  directory: team.slice(1),
  conversations: [
    {
      id: 'demo-conversation-1',
      updatedAt: '2026-09-26T08:45:00.000Z',
      participant: team[1],
      lastMessage: { id: 'demo-message-2', senderUserId: 'demo-team-2', createdAt: '2026-09-26T08:45:00.000Z', attachmentCount: 0 },
      messages: [
        { id: 'demo-message-1', clientMessageId: 'demo-client-message-1', senderUserId: 'demo-user', senderDeviceId: 'demo-device-1', encryptedEnvelope: 'The Nova launch deck is ready for the final review.', protocolVersion: 1, createdAt: '2026-09-26T08:40:00.000Z', attachments: [] },
        { id: 'demo-message-2', clientMessageId: 'demo-client-message-2', senderUserId: 'demo-team-2', senderDeviceId: 'demo-device-2', encryptedEnvelope: 'I have resolved the remaining brand-governance comments.', protocolVersion: 1, createdAt: '2026-09-26T08:45:00.000Z', attachments: [] },
      ],
      receiptStates: [{ messageId: 'demo-message-1', clientMessageId: 'demo-client-message-1', readAt: '2026-09-26T08:44:00.000Z' }],
    },
  ],
};

const atlas = {
  sessions: [{ id: 'demo-atlas-session-1', title: 'September agency performance', updatedAt: '2026-09-26T08:00:00.000Z' }],
  currentSessionId: 'demo-atlas-session-1',
  messages: [{ role: 'assistant' as const, content: 'Northstar Creative is operating from a healthy revenue base. Kinetic Health is the account requiring the closest delivery attention.' }],
  sessionMessages: { 'demo-atlas-session-1': [{ role: 'assistant' as const, content: 'Northstar Creative is operating from a healthy revenue base. Kinetic Health is the account requiring the closest delivery attention.' }] },
  userId: 'demo-user',
  userName: 'Alex Morgan',
  userAvatarUrl: null,
};

const revenueHistory = [
  { label: 'Apr', revenue: 39000, expenses: 17100, receivables: 12400 },
  { label: 'May', revenue: 43800, expenses: 18400, receivables: 10800 },
  { label: 'Jun', revenue: 47200, expenses: 19600, receivables: 14200 },
  { label: 'Jul', revenue: 49800, expenses: 20300, receivables: 11600 },
  { label: 'Aug', revenue: 51600, expenses: 21100, receivables: 9200 },
  { label: 'Sep', revenue: 55750, expenses: 22400, receivables: 13500 },
];

const invoices = [
  { id: 'demo-invoice-1', invoiceNumber: 'INV-2026-091', number: 'INV-2026-091', clientName: 'Nova Studio', client: 'Nova Studio', amount: 18000, paidAmount: 12000, pendingAmount: 6000, balanceDue: 6000, issuedDate: '2026-09-05T00:00:00.000Z', date: 'Sep 5, 2026', status: 'PARTIALLY_PAID' },
  { id: 'demo-invoice-2', invoiceNumber: 'INV-2026-094', number: 'INV-2026-094', clientName: 'Kinetic Health', client: 'Kinetic Health', amount: 12000, paidAmount: 4500, pendingAmount: 7500, balanceDue: 7500, issuedDate: '2026-09-12T00:00:00.000Z', date: 'Sep 12, 2026', status: 'SENT' },
];

const calendarEvents = [
  { id: 'demo-event-1', title: 'Nova launch review', description: 'Creative, media and launch-readiness review.', startTime: '2026-09-26T10:30:00.000Z', endTime: '2026-09-26T11:15:00.000Z', type: 'meetings', color: '#a1a1aa', location: 'Studio room A', attendees: ['alex@northstar.demo', 'jordan@nova.demo'], attendeeStatus: { 'alex@northstar.demo': 'ACCEPTED' }, creatorId: 'demo-user', isGoogleEvent: false, meetLink: null },
  { id: 'demo-event-2', title: 'Kinetic performance checkpoint', description: 'Review acquisition efficiency and next actions.', startTime: '2026-09-28T14:00:00.000Z', endTime: '2026-09-28T14:45:00.000Z', type: 'calls', color: '#71717a', location: 'Video call', attendees: ['alex@northstar.demo', 'morgan@kinetic.demo'], attendeeStatus: { 'alex@northstar.demo': 'ACCEPTED' }, creatorId: 'demo-user', isGoogleEvent: false, meetLink: null },
  { id: 'demo-event-3', title: 'Weekly delivery planning', description: 'Capacity and delivery planning across active accounts.', startTime: '2026-09-30T09:30:00.000Z', endTime: '2026-09-30T10:15:00.000Z', type: 'meetings', color: '#d4d4d8', location: 'Operations room', attendees: team.slice(0, 4).map((member) => member.email), attendeeStatus: {}, creatorId: 'demo-user', isGoogleEvent: false, meetLink: null },
];

const workspace: WorkspaceReadModel = {
  organization: { id: 'demo-org', name: 'Northstar Creative', plan: 'ADVANCED', agencyTypes: ['Creative Agency'], billingEmail: 'finance@northstar.demo', currency: 'USD', preferences: {}, legalEntityName: 'Northstar Creative LLC', billingAddressLine1: null, billingAddressLine2: null, billingCity: 'New York', billingState: 'NY', billingPostalCode: null, billingCountry: 'US', gstNumber: null, bankNames: ['Operating Account'], invoiceLogoDataUrl: null, invoiceBrandColor: '#18181b' },
  user: { id: 'demo-user', orgId: 'demo-org', clientId: null, name: 'Alex Morgan', username: 'alex', email: 'alex@northstar.demo', role: 'admin', avatarUrl: null, accessPermissions: null, deliveryWorkspace: false, hasMetaAccount: true, client: null, preferences: {} },
  onboarding: { needsOnboarding: false, currentStep: 5, checklist: { skippedAll: false }, draft: {}, completedAt: '2026-04-04T00:00:00.000Z' },
  integrations: [{ provider: 'GOOGLE', status: 'CONNECTED', lastSync: '2026-09-26T07:15:00.000Z' }, { provider: 'META', status: 'CONNECTED', lastSync: '2026-09-26T06:40:00.000Z' }, { provider: 'CANVA', status: 'CONNECTED', lastSync: '2026-09-25T18:20:00.000Z' }],
  entitlements: { specializationLimit: 12, teamMemberLimit: null, coreTeamMemberLimit: 25, clientLimit: null, projectLimit: null, activeLeadLimit: 500, dataTransferBytes: 10737418240, monthlyInvoiceLimit: null, dailyBriefing: true, strategyGeneration: true, aiFeatures: true, messaging: true, atlasCapabilities: ['ASK', 'ANALYZE', 'CREATE'], messagingLimits: {} },
};

const dashboard = {
  activeClientsCount: 4,
  totalClientsCount: 4,
  activeProjectsCount: 4,
  activeProjects: clients.flatMap((client) => client.projects).map((project) => ({ ...project, clientName: clients.find((client) => client.projects.some((item) => item.id === project.id))?.name || '' })),
  allProjects: clients.flatMap((client) => client.projects).map((project) => ({ ...project, clientName: clients.find((client) => client.projects.some((item) => item.id === project.id))?.name || '' })),
  projectRisks: [{ id: 'demo-project-kinetic', name: 'Member acquisition', riskLevel: 'MEDIUM', riskDescription: 'Attribution variance needs a client decision.' }],
  grossBillings: 55750,
  outstandingAmount: 13500,
  pendingReceivablesAmount: 13500,
  outstandingInvoices: invoices,
  totalExpenses: 22400,
  currentMonthRevenue: 55750,
  previousMonthRevenue: 51600,
  monthlyChangePercent: 8.04,
  revenueHistory,
  revenueByClient: [{ id: 'demo-client-nova', name: 'Nova Studio', domain: 'novastudio.demo', revenue: 18000, share: 32.3 }, { id: 'demo-client-arc', name: 'Arc & Co.', domain: 'arcandco.demo', revenue: 14500, share: 26 }, { id: 'demo-client-kinetic', name: 'Kinetic Health', domain: 'kinetic.demo', revenue: 12000, share: 21.5 }, { id: 'demo-client-luma', name: 'Luma House', domain: 'lumahouse.demo', revenue: 11250, share: 20.2 }],
};

const leads = [
  { id: 'demo-lead-1', leadId: 'demo-lead-1', fullName: 'Elena Torres', email: 'elena@fieldwork.demo', status: 'warm', value: 42000 },
  { id: 'demo-lead-2', leadId: 'demo-lead-2', fullName: 'Marcus Stone', email: 'marcus@meridian.demo', status: 'procured', value: 28000 },
  { id: 'demo-lead-3', leadId: 'demo-lead-3', fullName: 'Priya Kapoor', email: 'priya@commonform.demo', status: 'closed', value: 36000 },
  { id: 'demo-lead-4', leadId: 'demo-lead-4', fullName: 'Nolan Wells', email: 'nolan@awen.demo', status: 'cold', value: 18000 },
];

export type IrisDemoState = ReturnType<typeof createIrisDemoState>;

export function createIrisDemoState() {
  return clone({
    workspace,
    dashboard,
    clients,
    projects,
    team,
    tasks,
    calendarEvents,
    leads,
    invoices,
    reports,
    strategies,
    messaging,
    atlas,
    notifications: [
      { id: 'demo-note-1', type: 'APPROVAL', title: 'Nova launch creative is ready', body: 'Final creative is waiting for approval.', href: '/clients', actionLabel: 'Review', readAt: null as string | null, createdAt: '2026-09-26T07:30:00.000Z' },
      { id: 'demo-note-2', type: 'ISSUE', title: 'Kinetic attribution variance', body: 'Paid and CRM totals differ by 8.2%.', href: '/dashboard', actionLabel: 'Inspect', readAt: null as string | null, createdAt: '2026-09-26T06:50:00.000Z' },
    ],
    finance: { ...dashboard, recentInvoices: invoices, expenses: [{ id: 'demo-expense-1', category: 'Software', amount: 4200, date: '2026-09-04T00:00:00.000Z', merchant: 'Creative systems' }, { id: 'demo-expense-2', category: 'Contractors', amount: 9800, date: '2026-09-15T00:00:00.000Z', merchant: 'Production partners' }] },
    subscriptions: [{ id: 'demo-sub-1', name: 'Creative systems', amount: 820, category: 'AI subscriptions', frequency: 'monthly', startDate: '2026-01-01' }],
    transactions: [] as Array<Record<string, unknown>>,
  });
}

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

export async function handleIrisDemoRequest(
  state: IrisDemoState,
  setState: Dispatch<SetStateAction<IrisDemoState>>,
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  showNotice: (message: string) => void,
) {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url, 'https://demo.irisos.local');
  const method = (init?.method || 'GET').toUpperCase();
  const body = typeof init?.body === 'string' ? JSON.parse(init.body || '{}') : {};

  if (url.pathname === '/api/workspace') {
    if (method === 'PATCH') {
      setState((current) => ({ ...current, workspace: { ...current.workspace, organization: { ...current.workspace.organization, preferences: { ...(current.workspace.organization.preferences as object), ...(body.organization?.preferences || {}) } }, user: { ...current.workspace.user, preferences: { ...(current.workspace.user.preferences as object), ...(body.user?.preferences || {}) } } } }));
    }
    return json(state.workspace);
  }
  if (url.pathname === '/api/calendar') {
    if (method === 'GET') return json({ events: state.calendarEvents, googleConnected: true, googleAccountEmail: 'alex@northstar.demo', user: state.workspace.user });
    if (body.action === 'sync' || body.action === 'disconnect') {
      showNotice('External calendar connections are disabled in the interactive demo.');
      return json({ success: true, simulated: true });
    }
    if (method === 'POST') {
      const next = { ...body, id: `demo-event-${state.calendarEvents.length + 1}`, creatorId: state.workspace.user.id, isGoogleEvent: false, meetLink: null };
      setState((current) => ({ ...current, calendarEvents: [...current.calendarEvents, next] }));
      return json({ event: next }, 201);
    }
    if (method === 'PUT') {
      const existing = state.calendarEvents.find((event) => event.id === body.id);
      const next = existing ? { ...existing, ...body } : body;
      setState((current) => ({ ...current, calendarEvents: current.calendarEvents.map((event) => event.id === body.id ? next : event) }));
      return json({ success: true, event: next });
    }
    if (method === 'DELETE') {
      const id = url.searchParams.get('id') || body.id;
      setState((current) => ({ ...current, calendarEvents: current.calendarEvents.filter((event) => event.id !== id) }));
      return json({ success: true });
    }
  }
  if (url.pathname === '/api/user') {
    if (method === 'PATCH') {
      setState((current) => ({ ...current, workspace: { ...current.workspace, user: { ...current.workspace.user, ...body } } }));
      return json({ ...state.workspace.user, ...body, avatarUrl: body.avatarDataUrl ?? state.workspace.user.avatarUrl });
    }
    return json(state.workspace.user);
  }
  if (url.pathname === '/api/agency-leads') {
    if (method === 'POST' && body.action === 'update') {
      setState((current) => ({ ...current, leads: current.leads.map((lead) => lead.id === body.id ? { ...lead, ...body } : lead) }));
    }
    return json({ leads: state.leads, role: 'admin', archive: { archivedLeadCount: 0 }, metrics: { marketingSpend: 18400, closedLeadCount: 1, sourcedRetainerRevenue: 36000, averageCac: 4600, averageRoas: 1.96 }, meta: { metaAccessConsent: true, atlasMetaAnalyticsConsent: true, accounts: [], campaignCount: 3, metrics: { spend: 18400, impressions: 428000, reach: 271000, clicks: 9400, leadsCount: 4, ctr: 2.2, cpc: 1.96, cpm: 42.99, costPerLead: 4600 }, ads: [] }, stageCounts: [{ status: 'warm', count: 1 }, { status: 'procured', count: 1 }, { status: 'closed', count: 1 }, { status: 'cold', count: 1 }] });
  }
  if (url.pathname === '/api/notifications') {
    if (method === 'POST') {
      if (body.action === 'mark_all_read') setState((current) => ({ ...current, notifications: current.notifications.map((item) => ({ ...item, readAt: new Date().toISOString() })) }));
      else if (body.action === 'mark_read') setState((current) => ({ ...current, notifications: current.notifications.map((item) => item.id === body.id ? { ...item, readAt: new Date().toISOString() } : item) }));
      else if (body.action === 'create') setState((current) => ({ ...current, notifications: [...current.notifications, { ...body, id: `demo-note-${current.notifications.length + 1}`, readAt: null, createdAt: new Date().toISOString() }] }));
    }
    return json({ notifications: state.notifications, unreadCount: state.notifications.filter((item) => !item.readAt).length });
  }
  if (url.pathname === '/api/clients' && method === 'DELETE') {
    const id = url.searchParams.get('clientId');
    setState((current) => ({ ...current, clients: current.clients.filter((client) => client.id !== id) }));
    return json({ success: true });
  }
  if (url.pathname === '/api/clients' && method !== 'GET') {
    const id = body.clientId || body.id;
    const updated = { ...state.clients.find((client) => client.id === id), ...body, id };
    setState((current) => ({ ...current, clients: current.clients.map((client) => client.id === id ? updated : client) }));
    return json({ client: updated });
  }
  if (url.pathname === '/api/projects') {
    if (method === 'POST') {
      const next = { ...body, id: `demo-project-${state.projects.length + 1}`, progress: 0, status: body.status || 'TODO', tasks: [], stages: [] };
      setState((current) => ({ ...current, projects: [...current.projects, next] }));
      return json(next, 201);
    }
    return json(state.projects);
  }
  if (url.pathname === '/api/tasks') {
    if (method === 'POST') {
      const next = { ...body, id: `demo-task-${state.tasks.length + 1}`, status: body.status || 'TODO', progress: body.progress || 0 };
      setState((current) => ({ ...current, tasks: [...current.tasks, next] }));
      return json(next, 201);
    }
    if (method === 'PATCH' || method === 'PUT') {
      const id = body.id || url.searchParams.get('id');
      const next = state.tasks.find((task) => task.id === id);
      const updated = next ? { ...next, ...body } : body;
      setState((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? updated : task) }));
      return json(updated);
    }
    if (method === 'DELETE') {
      const id = body.id || url.searchParams.get('id');
      setState((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }));
      return json({ success: true });
    }
    return json(state.tasks);
  }
  if (url.pathname === '/api/invoices') {
    if (method === 'POST') {
      const next = { ...body, id: `demo-invoice-${state.invoices.length + 1}`, invoiceNumber: body.invoiceNumber || `INV-DEMO-${state.invoices.length + 1}`, status: 'UNPAID', documentType: body.mode === 'PROFORMA' ? 'PROFORMA' : 'TAX' };
      setState((current) => ({ ...current, invoices: [...current.invoices, next] }));
      return json({ invoice: next }, 201);
    }
    if (method === 'DELETE') {
      const id = url.searchParams.get('id');
      setState((current) => ({ ...current, invoices: current.invoices.filter((invoice) => invoice.id !== id) }));
      return json({ success: true });
    }
    return json(url.searchParams.has('outstanding') ? state.dashboard.outstandingInvoices : state.invoices);
  }
  if (url.pathname === '/api/deliverables') return json([]);
  if (url.pathname === '/api/meta-portal') return json({ connected: true, metrics: [], campaigns: [] });
  if (url.pathname === '/api/reports') {
    if (method === 'POST') {
      const next = { id: `demo-report-${state.reports.length + 1}`, title: `${String(body.kind || 'Executive').toLowerCase()} report`, type: body.kind || 'EXECUTIVE', status: 'READY', client: 'Agency-wide', author: state.workspace.user.name, pageCount: 3, pdfUrl: null, date: 'Sep 26, 2026' };
      setState((current) => ({ ...current, reports: [next, ...current.reports] }));
      return json(next, 201);
    }
    return json(state.reports);
  }
  if (url.pathname === '/api/strategies') {
    if (method === 'POST') {
      const next = { id: `demo-strategy-${state.strategies.length + 1}`, type: body.type || 'FINANCIAL', title: body.title || 'Demo strategy', goal: body.goal || '', timeline: body.timeline || 'Next 90 days', content: '## Direction\n\nFocus the team on the selected objective, review progress weekly, and keep commercial guardrails visible.', model: 'IrisOS demo intelligence', createdAt: new Date().toISOString(), createdBy: { name: state.workspace.user.name } };
      setState((current) => ({ ...current, strategies: [next, ...current.strategies] }));
      return json({ strategy: next }, 201);
    }
    return json({ strategies: state.strategies, clients: state.clients.map((client) => ({ id: client.id, name: client.name, status: client.status })), projects: state.projects.map((project) => ({ id: project.id, name: project.name, status: project.status, clientId: project.clientId, clientName: project.client.name })) });
  }
  if (url.pathname === '/api/messaging') {
    if (method === 'DELETE') {
      const conversationId = url.searchParams.get('conversationId');
      setState((current) => ({ ...current, messaging: { ...current.messaging, conversations: current.messaging.conversations.filter((conversation) => conversation.id !== conversationId) } }));
      return json({ success: true });
    }
    return json(state.messaging);
  }
  if (url.pathname === '/api/messaging/messages') return json({ messages: [], receiptStates: [] });
  if (url.pathname === '/api/security/users') return json({ users: state.team });
  if (url.pathname === '/api/member') return json({ success: true });
  if (url.pathname === '/api/generated-documents') return json({ success: true, id: 'demo-document' }, 201);
  if (url.pathname === '/api/proposals/pdf' || url.pathname === '/api/legal-documents/pdf') {
    showNotice('Document generation is simulated in the safe demo.');
    return new Response(new Blob(['Demo document preview'], { type: 'application/pdf' }), { status: 200, headers: { 'Content-Type': 'application/pdf' } });
  }
  if (url.pathname === '/api/subscriptions') {
    if (method === 'POST') {
      const next = { ...body, id: `demo-sub-${state.subscriptions.length + 1}` };
      setState((current) => ({ ...current, subscriptions: [...current.subscriptions, next] }));
      return json(next, 201);
    }
    if (method === 'PATCH') {
      const next = state.subscriptions.find((item) => item.id === body.id);
      const updated = next ? { ...next, ...body } : body;
      setState((current) => ({ ...current, subscriptions: current.subscriptions.map((item) => item.id === body.id ? updated : item) }));
      return json(updated);
    }
    if (method === 'DELETE') {
      const id = url.searchParams.get('id');
      setState((current) => ({ ...current, subscriptions: current.subscriptions.filter((item) => item.id !== id) }));
      return json({ success: true });
    }
    return json(state.subscriptions);
  }
  if (url.pathname === '/api/transactions') {
    if (method === 'POST') {
      const next = { ...body, id: `demo-transaction-${state.transactions.length + 1}`, createdAt: new Date().toISOString() };
      setState((current) => ({ ...current, transactions: [next, ...current.transactions] }));
      return json(next, 201);
    }
    if (method === 'DELETE') {
      const id = url.searchParams.get('id');
      setState((current) => ({ ...current, transactions: current.transactions.filter((item) => item.id !== id) }));
      return json({ success: true });
    }
    return json(state.transactions);
  }
  if (url.pathname === '/api/plan-usage') return json({ clients: state.clients.length, projects: state.projects.length, activeLeads: state.leads.filter((lead) => lead.status !== 'closed').length, teamMembers: state.team.length, coreTeamMembers: state.team.length, dataTransferBytes: 184000000, monthlyInvoices: state.invoices.length });
  if (url.pathname === '/api/atlas-ai/usage') return json({ usage: { total: 28400 }, limits: { total: 250000 } });
  if (url.pathname === '/api/integrations') {
    if (method === 'POST') {
      showNotice('External account connections are simulated inside the safe demo.');
      return json({ success: true, simulated: true, meta: { facebookUserName: 'Alex Morgan', facebookUserEmail: 'alex@northstar.demo', tokenExpiresAt: null, adAccounts: [], selectedAdAccountIds: [], pages: [], leadSyncReady: true } });
    }
    return json(state.workspace.integrations);
  }
  if (url.pathname === '/api/organization') {
    if (method === 'POST' || method === 'PATCH') {
      setState((current) => ({ ...current, workspace: { ...current.workspace, organization: { ...current.workspace.organization, ...body } } }));
      return json({ ...state.workspace.organization, ...body, success: true });
    }
    return json(state.workspace.organization);
  }
  if (url.pathname === '/api/data' && url.searchParams.get('domain') === 'finance') return json(state.finance);
  if (url.pathname === '/api/data' && url.searchParams.get('domain') === 'clients') return json(state.clients);
  if (url.pathname === '/api/data' && url.searchParams.get('domain') === 'team') return json(state.team);

  showNotice('That production-connected action is disabled in the interactive demo.');
  return json({ error: 'Unavailable in demo mode', demo: true }, 403);
}

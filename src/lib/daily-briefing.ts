export const DAILY_BRIEFING_BOUNDARY_HOUR = 4;
export const DAILY_BRIEFING_DEFAULT_TIME_ZONE = 'Asia/Kolkata';
export const DAILY_BRIEFING_VERSION = 2;

export type DailyBriefingTone = 'attention' | 'calm' | 'positive';

export type DailyBriefingItem = {
  id: 'priority-tasks' | 'revenue' | 'meetings' | 'receivables' | 'delivery-delays' | 'pipeline' | 'renewals-due' | 'blocked-tasks';
  label: string;
  title: string;
  metric: string;
  summary: string;
  details: string[];
  href: string;
  tone: DailyBriefingTone;
};

export type DailyBriefingPayload = {
  version: number;
  businessDate: string;
  generatedAt: string;
  greeting: string;
  introduction: string;
  items: DailyBriefingItem[];
};

type BriefingTask = {
  title: string;
  status: string;
  deadline: Date | null;
  projectName: string | null;
};

type BriefingTransaction = { amount: number; date: Date };
type BriefingInvoice = { amount: number; paidAmount: number; dueDate: Date | null; status: string; invoiceNumber: string };
type BriefingMeeting = { title: string; startTime: Date; attendees: string[] };
type BriefingProject = { name: string; status: string; progress: number; delayedStages: string[]; delayedTasks: string[] };
type BriefingLead = { fullName: string; status: string; estimatedClientValue: number | null };
type BriefingClient = { name: string; churnRiskScore: number; renewalDate: Date | null };

export type DailyBriefingSnapshot = {
  userName: string;
  currency: string;
  timeZone: string;
  now: Date;
  tasks: BriefingTask[];
  transactions: BriefingTransaction[];
  invoices: BriefingInvoice[];
  meetings: BriefingMeeting[];
  projects: BriefingProject[];
  leads: BriefingLead[];
  clients: BriefingClient[];
};

function zonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
  };
}

function dateKey(year: number, month: number, day: number) {
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function shiftDateKey(key: string, days: number) {
  const [year, month, day] = key.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return dateKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

export function normalizeBriefingTimeZone(value: unknown) {
  const candidate = typeof value === 'string' && value.trim() ? value.trim() : DAILY_BRIEFING_DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return DAILY_BRIEFING_DEFAULT_TIME_ZONE;
  }
}

export function dailyBriefingBusinessDate(
  now: Date,
  requestedTimeZone: unknown,
  boundaryHour = DAILY_BRIEFING_BOUNDARY_HOUR,
) {
  const timeZone = normalizeBriefingTimeZone(requestedTimeZone);
  const parts = zonedParts(now, timeZone);
  const localDate = dateKey(parts.year, parts.month, parts.day);
  return parts.hour < boundaryHour ? shiftDateKey(localDate, -1) : localDate;
}

function localDateKey(date: Date, timeZone: string) {
  const parts = zonedParts(date, timeZone);
  return dateKey(parts.year, parts.month, parts.day);
}

function monthKey(date: Date, timeZone: string) {
  return localDateKey(date, timeZone).slice(0, 7);
}

function previousMonthKey(now: Date, timeZone: string) {
  const parts = zonedParts(now, timeZone);
  const previous = new Date(Date.UTC(parts.year, parts.month - 2, 1));
  return `${previous.getUTCFullYear()}-${(previous.getUTCMonth() + 1).toString().padStart(2, '0')}`;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: amount >= 100_000 ? 'compact' : 'standard',
    maximumFractionDigits: amount >= 1_000 ? 0 : 2,
  }).format(amount);
}

function formatMeetingTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function safeName(name: string) {
  return name.trim().split(/\s+/)[0] || 'there';
}

export function dailyBriefingGreeting(userName: string, now: Date, requestedTimeZone: unknown) {
  const hour = zonedParts(now, normalizeBriefingTimeZone(requestedTimeZone)).hour;
  const greeting = hour < 12 ? 'Good morning' : hour < 16 ? 'Good afternoon' : 'Good evening';
  return `${greeting}, ${safeName(userName)}.`;
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function buildDailyBriefing(snapshot: DailyBriefingSnapshot): DailyBriefingPayload {
  const timeZone = normalizeBriefingTimeZone(snapshot.timeZone);
  const businessDate = dailyBriefingBusinessDate(snapshot.now, timeZone);
  const todayKey = localDateKey(snapshot.now, timeZone);
  const nextWeek = new Date(snapshot.now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(snapshot.now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const openTasks = snapshot.tasks.filter((task) => task.status !== 'COMPLETED');
  const urgentTasks = openTasks
    .filter((task) => task.status !== 'BLOCKED' && task.deadline && task.deadline <= nextWeek)
    .sort((left, right) => {
      return (left.deadline?.getTime() ?? Number.MAX_SAFE_INTEGER) - (right.deadline?.getTime() ?? Number.MAX_SAFE_INTEGER);
    });
  const blockedTasks = openTasks.filter((task) => task.status === 'BLOCKED');

  const currentMonth = monthKey(snapshot.now, timeZone);
  const previousMonth = previousMonthKey(snapshot.now, timeZone);
  const currentRevenue = snapshot.transactions
    .filter((transaction) => monthKey(transaction.date, timeZone) === currentMonth)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const previousRevenue = snapshot.transactions
    .filter((transaction) => monthKey(transaction.date, timeZone) === previousMonth)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const revenueChange = percentChange(currentRevenue, previousRevenue);

  const upcomingMeetings = snapshot.meetings
    .filter((meeting) => meeting.startTime >= snapshot.now && meeting.startTime <= nextWeek)
    .sort((left, right) => left.startTime.getTime() - right.startTime.getTime());
  const todayMeetings = upcomingMeetings.filter((meeting) => localDateKey(meeting.startTime, timeZone) === todayKey);

  const openInvoices = snapshot.invoices.filter((invoice) => invoice.status !== 'FULLY_PAID');
  const outstanding = openInvoices.reduce((sum, invoice) => sum + Math.max(0, invoice.amount - invoice.paidAmount), 0);
  const overdueInvoices = openInvoices.filter((invoice) => invoice.dueDate && invoice.dueDate < snapshot.now);

  const delayedStages = snapshot.projects.flatMap((project) =>
    project.delayedStages.map((stage) => ({ name: stage, projectName: project.name })),
  );
  const delayedTasks = snapshot.projects.flatMap((project) =>
    project.delayedTasks.map((task) => ({ name: task, projectName: project.name })),
  );
  const totalDeliveryDelays = delayedStages.length + delayedTasks.length;

  const activeLeads = snapshot.leads.filter((lead) => ['warm', 'procured'].includes(lead.status.toLowerCase()));
  const pipelineValue = activeLeads.reduce((sum, lead) => sum + (lead.estimatedClientValue || 0), 0);

  const highChurnClients = snapshot.clients
    .filter((client) => client.churnRiskScore >= 60)
    .sort((left, right) => right.churnRiskScore - left.churnRiskScore);
  const upcomingRenewals = snapshot.clients
    .filter((client) => client.renewalDate && client.renewalDate >= snapshot.now && client.renewalDate <= nextMonth)
    .sort((left, right) => (left.renewalDate?.getTime() || 0) - (right.renewalDate?.getTime() || 0));

  const items: DailyBriefingItem[] = [
    {
      id: 'priority-tasks',
      label: 'Priority tasks',
      title: urgentTasks.length ? 'Your action queue needs a pass.' : 'The action queue is under control.',
      metric: `${urgentTasks.length} priority`,
      summary: `${openTasks.length} tasks remain open, with ${urgentTasks.length} due or approaching deadline this week.`,
      details: urgentTasks.slice(0, 3).map((task) => `${task.title}${task.projectName ? ` · ${task.projectName}` : ''}`),
      href: '/tasks',
      tone: urgentTasks.length ? 'attention' : 'positive',
    },
    {
      id: 'revenue',
      label: 'Revenue',
      title: 'Here is the month so far.',
      metric: formatCurrency(currentRevenue, snapshot.currency),
      summary: revenueChange === null
        ? 'This is the first comparable revenue period in the ledger.'
        : `Recognized revenue is ${Math.abs(revenueChange).toFixed(1)}% ${revenueChange >= 0 ? 'ahead of' : 'behind'} last month at this point.`,
      details: [
        `Previous month · ${formatCurrency(previousRevenue, snapshot.currency)}`,
        'Revenue reflects posted ledger transactions, not unpaid invoices.',
      ],
      href: '/finance',
      tone: revenueChange !== null && revenueChange < 0 ? 'attention' : 'positive',
    },
    {
      id: 'meetings',
      label: 'Meetings',
      title: todayMeetings.length ? 'Your calendar has momentum today.' : 'Today has room for focused work.',
      metric: `${todayMeetings.length} today`,
      summary: `${upcomingMeetings.length} ${upcomingMeetings.length === 1 ? 'meeting is' : 'meetings are'} scheduled over the next seven days.`,
      details: upcomingMeetings.slice(0, 3).map((meeting) => `${formatMeetingTime(meeting.startTime, timeZone)} · ${meeting.title}`),
      href: '/calendar',
      tone: 'calm',
    },
    {
      id: 'receivables',
      label: 'Receivables',
      title: overdueInvoices.length ? 'A few invoices need a nudge.' : 'Receivables are tracking cleanly.',
      metric: formatCurrency(outstanding, snapshot.currency),
      summary: `${openInvoices.length} open ${openInvoices.length === 1 ? 'invoice carries' : 'invoices carry'} the current outstanding balance; ${overdueInvoices.length} are overdue.`,
      details: overdueInvoices.slice(0, 3).map((invoice) => `${invoice.invoiceNumber} · ${formatCurrency(Math.max(0, invoice.amount - invoice.paidAmount), snapshot.currency)}`),
      href: '/invoices',
      tone: overdueInvoices.length ? 'attention' : 'positive',
    },
    {
      id: 'delivery-delays',
      label: 'Stage & task delays',
      title: totalDeliveryDelays ? 'These deadlines have slipped.' : 'Stages and tasks are landing on time.',
      metric: `${totalDeliveryDelays} delayed`,
      summary: `${delayedStages.length} ${delayedStages.length === 1 ? 'stage is' : 'stages are'} late and ${delayedTasks.length} ${delayedTasks.length === 1 ? 'task is' : 'tasks are'} past deadline.`,
      details: [
        ...delayedStages.map((stage) => `${stage.name} · stage · ${stage.projectName}`),
        ...delayedTasks.map((task) => `${task.name} · task · ${task.projectName}`),
      ].slice(0, 3),
      href: '/projects',
      tone: totalDeliveryDelays ? 'attention' : 'positive',
    },
    {
      id: 'pipeline',
      label: 'Pipeline',
      title: activeLeads.length ? 'There is business worth following up.' : 'The warm pipeline is quiet today.',
      metric: `${activeLeads.length} active`,
      summary: pipelineValue
        ? `Warm and procured opportunities represent ${formatCurrency(pipelineValue, snapshot.currency)} in estimated client value.`
        : 'No estimated value has been assigned to the active opportunities yet.',
      details: activeLeads.slice(0, 3).map((lead) => `${lead.fullName} · ${lead.status}`),
      href: '/agency-leads',
      tone: activeLeads.length ? 'positive' : 'calm',
    },
    {
      id: 'renewals-due',
      label: 'Renewals due',
      title: upcomingRenewals.length ? 'These renewals need a clear next step.' : 'No renewals are due this month.',
      metric: `${upcomingRenewals.length} due`,
      summary: `${upcomingRenewals.length} client ${upcomingRenewals.length === 1 ? 'renewal falls' : 'renewals fall'} within the next 30 days; ${highChurnClients.length} accounts carry elevated churn risk.`,
      details: [
        ...upcomingRenewals.slice(0, 2).map((client) => `${client.name} · renewal approaching`),
        ...highChurnClients.slice(0, 1).map((client) => `${client.name} · ${client.churnRiskScore}% churn risk`),
      ],
      href: '/clients',
      tone: upcomingRenewals.length || highChurnClients.length ? 'attention' : 'positive',
    },
    {
      id: 'blocked-tasks',
      label: 'Blocked tasks',
      title: blockedTasks.length ? 'Unblock these before adding more work.' : 'Nothing is blocked right now.',
      metric: `${blockedTasks.length} blocked`,
      summary: `${blockedTasks.length} ${blockedTasks.length === 1 ? 'task is' : 'tasks are'} waiting on a decision, dependency, or handoff.`,
      details: blockedTasks.slice(0, 3).map((task) => `${task.title}${task.projectName ? ` · ${task.projectName}` : ''}`),
      href: '/tasks',
      tone: blockedTasks.length ? 'attention' : 'positive',
    },
  ];

  const totalActions = urgentTasks.length + overdueInvoices.length + totalDeliveryDelays + blockedTasks.length + upcomingRenewals.length;

  return {
    version: DAILY_BRIEFING_VERSION,
    businessDate,
    generatedAt: snapshot.now.toISOString(),
    greeting: dailyBriefingGreeting(snapshot.userName, snapshot.now, timeZone),
    introduction: totalActions
      ? `Atlas found ${totalActions} items worth your attention. We will take them one at a time.`
      : 'Atlas completed the morning scan. Everything important is moving in the right direction.',
    items,
  };
}

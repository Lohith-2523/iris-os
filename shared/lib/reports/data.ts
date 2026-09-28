import 'server-only';

import { prisma } from '@/lib/db';
import { generateReportWithGemini } from '@/lib/atlas-ai/gemini-automations';
import type { AtlasReportDocument, ReportKind, ReportMetric, ReportSection } from './types';
import { entitlementsFor } from '@/lib/plan-entitlements';
import { normalizePlan } from '@/lib/plan-entitlements';
import type { AtlasTokenBudgetContext } from '@/lib/atlas-ai/token-budget';

const money = (value: number, currency: string) => `${currency} ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const date = (value: Date | null | undefined) => value ? value.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'Not set';
const pct = (value: number) => `${Math.round(value)}%`;
const clean = (value: unknown, fallback = 'Not set') => String(value ?? '').trim() || fallback;
const titleFor = (kind: ReportKind, clientName?: string) => ({
  EXECUTIVE: 'Executive Performance Report',
  LEADS: 'Leads Pipeline Report',
  MARKETING: 'Marketing Performance Report',
  CLIENTS: clientName ? `${clientName} Client Detail Report` : 'Client Portfolio Report',
  PROJECTS: 'Projects Delivery Report',
  TEAM: 'Team Capacity Report',
}[kind]);

function deterministicNarrative(kind: ReportKind, metrics: ReportMetric[], highlights: string[]) {
  return `Miles reviewed the available ${kind.toLowerCase()} dataset. ${metrics.slice(0, 3).map((metric) => `${metric.label} is ${metric.value}`).join(', ')}. ${highlights.slice(0, 2).join(' ')}`;
}

async function atlasNarrative(input: {
  enabled: boolean;
  title: string;
  kind: ReportKind;
  context: string;
  metrics: ReportMetric[];
  highlights: string[];
  focus?: string;
  tokenBudget: AtlasTokenBudgetContext;
}) {
  if (!input.enabled) return deterministicNarrative(input.kind, input.metrics, input.highlights);
  try {
    return await generateReportWithGemini({
      title: input.title,
      type: input.kind,
      focus: input.focus
        ? `Address this requested report brief in detail, grounded only in the supplied verified metrics and records: ${input.focus}`
        : 'Provide a concise executive narrative grounded only in the supplied verified metrics and records.',
      workspaceContext: input.context,
      tokenBudget: input.tokenBudget,
    });
  } catch (error) {
    console.warn('Miles report narrative fell back to deterministic analysis:', error instanceof Error ? error.message : error);
    return deterministicNarrative(input.kind, input.metrics, input.highlights);
  }
}

export async function buildAtlasReportDocument(
  orgId: string,
  userId: string,
  userRole: string,
  kind: ReportKind,
  clientId?: string,
  request?: { title?: string; focus?: string },
): Promise<AtlasReportDocument> {
  const organization = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!organization) throw new Error('Organization not found.');
  const currency = organization.currency;
  let metrics: ReportMetric[] = [];
  let highlights: string[] = [];
  let sections: [ReportSection, ReportSection];
  let context = '';
  let clientName: string | undefined;

  if (kind === 'EXECUTIVE') {
    const [clients, projects, leads, invoices, team] = await Promise.all([
      prisma.client.findMany({ where: { orgId }, include: { _count: { select: { projects: true } } }, orderBy: { name: 'asc' }, take: 30 }),
      prisma.project.findMany({ where: { orgId }, include: { client: { select: { name: true } } }, orderBy: { updatedAt: 'desc' }, take: 30 }),
      prisma.agencyLead.findMany({ where: { orgId }, orderBy: { createdTime: 'desc' }, take: 100 }),
      prisma.invoice.findMany({ where: { orgId }, orderBy: { issuedDate: 'desc' }, take: 100 }),
      prisma.user.findMany({ where: { orgId, role: { in: ['admin', 'member'] } }, orderBy: { name: 'asc' } }),
    ]);
    const activeClients = clients.filter((item) => item.status === 'ACTIVE').length;
    const activeProjects = projects.filter((item) => ['IN_PROGRESS', 'NOT_STARTED'].includes(item.status)).length;
    const closedLeads = leads.filter((item) => item.status.toLowerCase() === 'closed').length;
    const invoiced = invoices.reduce((sum, item) => sum + item.amount, 0);
    metrics = [
      { label: 'Active clients', value: String(activeClients), detail: `${clients.length} total` },
      { label: 'Active projects', value: String(activeProjects), detail: `${projects.length} tracked` },
      { label: 'Lead conversion', value: leads.length ? pct(closedLeads / leads.length * 100) : 'N/A', detail: `${closedLeads} closed` },
      { label: 'Invoiced value', value: money(invoiced, currency), detail: `${invoices.length} invoices` },
      { label: 'Team members', value: String(team.length), detail: 'Admins and members' },
    ];
    highlights = [
      `${projects.filter((item) => item.riskLevel === 'HIGH').length} projects currently carry a high risk classification.`,
      `${clients.filter((item) => item.churnRiskScore >= 60).length} clients have churn risk at or above 60.`,
      `${leads.filter((item) => ['procured', 'new', 'warm'].includes(item.status.toLowerCase())).length} leads remain in active early-stage pipeline.`,
    ];
    sections = [
      { title: 'Client portfolio', description: 'Account health, value signals, and delivery footprint.', columns: ['Client', 'Status', 'Churn', 'ROI', 'Projects'], rows: clients.slice(0, 18).map((item) => [item.name, item.status, String(item.churnRiskScore), `${item.roiMetric.toFixed(1)}x`, String(item._count.projects)]) },
      { title: 'Project delivery', description: 'Current work ordered by most recently updated.', columns: ['Project', 'Client', 'Status', 'Progress', 'Risk'], rows: projects.slice(0, 18).map((item) => [item.name, item.client.name, item.status, pct(item.progress), item.riskLevel]) },
    ];
    context = JSON.stringify({ metrics, highlights, clients: sections[0].rows, projects: sections[1].rows });
  } else if (kind === 'LEADS') {
    const leads = await prisma.agencyLead.findMany({ where: { orgId }, orderBy: { createdTime: 'desc' }, take: 120 });
    const statuses = new Map<string, number>();
    const sources = new Map<string, number>();
    leads.forEach((lead) => {
      statuses.set(lead.status, (statuses.get(lead.status) || 0) + 1);
      const source = lead.sourceProvider || lead.collectionMethod || 'Manual';
      sources.set(source, (sources.get(source) || 0) + 1);
    });
    const closed = leads.filter((lead) => lead.status.toLowerCase() === 'closed').length;
    const totalValue = leads.reduce((sum, lead) => sum + (lead.estimatedClientValue || 0), 0);
    metrics = [
      { label: 'Total leads', value: String(leads.length), detail: 'Current register' },
      { label: 'Closed', value: String(closed), detail: leads.length ? `${pct(closed / leads.length * 100)} conversion` : 'No leads' },
      { label: 'Pipeline value', value: money(totalValue, currency), detail: 'Estimated total' },
      { label: 'Meta leads', value: String(leads.filter((lead) => lead.sourceProvider === 'META').length), detail: 'Stored locally' },
    ];
    highlights = [...statuses.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([status, count]) => `${count} leads are currently classified as ${status}.`);
    sections = [
      { title: 'Lead register', description: 'Granular lead-level pipeline detail. Meta contacts shown here are not sent to Miles.', columns: ['Name', 'Email', 'Status', 'Source', 'Created'], rows: leads.slice(0, 22).map((lead) => [lead.fullName, clean(lead.email, 'Not provided'), lead.status, lead.sourceProvider || lead.collectionMethod || 'Manual', date(lead.createdTime)]) },
      { title: 'Source and stage distribution', description: 'Pipeline composition across acquisition sources and stages.', columns: ['Dimension', 'Value', 'Lead count', 'Share'], rows: [
        ...[...statuses.entries()].map(([value, count]) => ['Stage', value, String(count), leads.length ? pct(count / leads.length * 100) : '0%']),
        ...[...sources.entries()].map(([value, count]) => ['Source', value, String(count), leads.length ? pct(count / leads.length * 100) : '0%']),
      ].slice(0, 22) },
    ];
    const atlasSafeLeads = leads.filter((lead) => lead.sourceProvider !== 'META').slice(0, 30).map((lead) => ({ name: lead.fullName, status: lead.status, source: lead.sourceProvider || lead.collectionMethod, value: lead.estimatedClientValue }));
    context = JSON.stringify({ metrics, highlights, distributions: sections[1].rows, nonMetaLeadRecords: atlasSafeLeads, metaPrivacyRule: 'Raw Meta contact fields are excluded.' });
  } else if (kind === 'MARKETING') {
    const [campaigns, ads] = await Promise.all([
      prisma.metaCampaign.findMany({ where: { orgId }, include: { _count: { select: { ads: true } } }, orderBy: { updatedAt: 'desc' }, take: 40 }),
      prisma.metaAd.findMany({ where: { orgId }, include: { campaign: { select: { name: true } } }, orderBy: { spend: 'desc' }, take: 80 }),
    ]);
    const spend = ads.reduce((sum, ad) => sum + ad.spend, 0);
    const impressions = ads.reduce((sum, ad) => sum + ad.impressions, 0);
    const clicks = ads.reduce((sum, ad) => sum + ad.clicks, 0);
    const leads = ads.reduce((sum, ad) => sum + ad.leadsCount, 0);
    metrics = [
      { label: 'Ad spend', value: money(spend, currency), detail: `${ads.length} ads` },
      { label: 'Impressions', value: impressions.toLocaleString(), detail: `${campaigns.length} campaigns` },
      { label: 'CTR', value: impressions ? `${(clicks / impressions * 100).toFixed(2)}%` : 'N/A', detail: `${clicks.toLocaleString()} clicks` },
      { label: 'Cost per lead', value: leads ? money(spend / leads, currency) : 'N/A', detail: `${leads} leads` },
    ];
    highlights = [
      `${campaigns.filter((item) => item.status === 'ACTIVE').length} campaigns are active.`,
      ads[0] ? `${ads[0].name} has the highest recorded spend at ${money(ads[0].spend, currency)}.` : 'No ad delivery has been synchronized.',
      `Recorded delivery totals ${impressions.toLocaleString()} impressions and ${clicks.toLocaleString()} clicks.`,
    ];
    sections = [
      { title: 'Campaign breakdown', description: 'Provider-synchronized campaign delivery inventory.', columns: ['Campaign', 'Status', 'Objective', 'Ads', 'Daily budget'], rows: campaigns.slice(0, 20).map((item) => [item.name, item.status, clean(item.objective), String(item._count.ads), item.dailyBudget == null ? 'Not set' : money(item.dailyBudget, currency)]) },
      { title: 'Ad performance breakdown', description: 'Granular delivery metrics ordered by spend.', columns: ['Ad', 'Campaign', 'Spend', 'Impr.', 'Clicks', 'Leads'], rows: ads.slice(0, 22).map((item) => [item.name, item.campaign?.name || 'Unassigned', money(item.spend, currency), item.impressions.toLocaleString(), item.clicks.toLocaleString(), String(item.leadsCount)]) },
    ];
    const metaMetricsAllowed = organization.aiSharingConsent && organization.metaAccessConsent && organization.atlasMetaAnalyticsConsent;
    context = metaMetricsAllowed ? JSON.stringify({ metrics, highlights, aggregateCampaignCount: campaigns.length, aggregateAdCount: ads.length }) : 'Meta advertising metrics excluded because specialized Miles Meta analytics consent is disabled.';
  } else if (kind === 'CLIENTS') {
    const clients = await prisma.client.findMany({
      where: { orgId, ...(clientId ? { id: clientId } : {}) },
      include: { contacts: true, projects: true, invoices: true, tasks: true },
      orderBy: { name: 'asc' },
      take: 40,
    });
    if (clientId && clients.length === 0) throw new Error('Client not found.');
    clientName = clientId ? clients[0]?.name : undefined;
    const invoiceValue = clients.flatMap((item) => item.invoices).reduce((sum, invoice) => sum + invoice.amount, 0);
    const activeProjects = clients.flatMap((item) => item.projects).filter((item) => item.status === 'IN_PROGRESS').length;
    metrics = [
      { label: clientId ? 'Account' : 'Clients', value: clientId ? clients[0].status : String(clients.length), detail: clientName || 'Portfolio total' },
      { label: 'Invoiced value', value: money(invoiceValue, currency), detail: `${clients.flatMap((item) => item.invoices).length} invoices` },
      { label: 'Active projects', value: String(activeProjects), detail: `${clients.flatMap((item) => item.projects).length} total` },
      { label: 'Open tasks', value: String(clients.flatMap((item) => item.tasks).filter((item) => item.status !== 'COMPLETED').length), detail: 'Delivery workload' },
    ];
    highlights = clients.slice(0, 3).map((item) => `${item.name} has churn risk ${item.churnRiskScore}, ROI ${item.roiMetric.toFixed(1)}x, and ${item.projects.length} projects.`);
    sections = [
      { title: 'Client account breakdown', description: 'Detailed account health and commercial footprint. Meta advertising metrics are intentionally excluded.', columns: ['Client', 'Status', 'Churn', 'ROI', 'Projects', 'Invoices'], rows: clients.slice(0, 20).map((item) => [item.name, item.status, String(item.churnRiskScore), `${item.roiMetric.toFixed(1)}x`, String(item.projects.length), money(item.invoices.reduce((sum, invoice) => sum + invoice.amount, 0), currency)]) },
      { title: clientName ? `${clientName} delivery detail` : 'Client delivery detail', description: 'Projects, progress, account contacts, and workload without Meta ad metrics.', columns: ['Client', 'Record', 'Detail', 'Status', 'Value'], rows: clients.flatMap((item) => [
        ...item.projects.map((project) => [item.name, project.name, `${project.serviceLine || 'Project'} / ${pct(project.progress)}`, project.status, project.paymentAmount == null ? 'Not set' : money(project.paymentAmount, currency)]),
        ...item.contacts.map((contact) => [item.name, contact.name, contact.email, contact.role || 'Contact', clean(contact.phone)]),
      ]).slice(0, 22) },
    ];
    context = JSON.stringify({ metrics, highlights, accounts: sections[0].rows, delivery: sections[1].rows, explicitExclusion: 'No Meta advertising metrics included.' });
  } else if (kind === 'PROJECTS') {
    const projects = await prisma.project.findMany({ where: { orgId }, include: { client: true, milestones: true, tasks: true, members: { include: { user: true } } }, orderBy: { updatedAt: 'desc' }, take: 50 });
    const active = projects.filter((item) => item.status === 'IN_PROGRESS').length;
    const highRisk = projects.filter((item) => item.riskLevel === 'HIGH').length;
    metrics = [
      { label: 'Projects', value: String(projects.length), detail: `${active} active` },
      { label: 'Average progress', value: projects.length ? pct(projects.reduce((sum, item) => sum + item.progress, 0) / projects.length) : 'N/A', detail: 'Across portfolio' },
      { label: 'High risk', value: String(highRisk), detail: 'Requires attention' },
      { label: 'Open milestones', value: String(projects.flatMap((item) => item.milestones).filter((item) => item.status !== 'COMPLETED').length), detail: 'Delivery checkpoints' },
    ];
    highlights = projects.filter((item) => item.riskLevel !== 'LOW').slice(0, 3).map((item) => `${item.name} is ${item.riskLevel.toLowerCase()} risk at ${item.progress}% progress.`);
    if (!highlights.length) highlights = ['No medium- or high-risk projects are currently recorded.'];
    sections = [
      { title: 'Project portfolio', description: 'Granular delivery state, ownership, timing, and commercial value.', columns: ['Project', 'Client', 'Status', 'Progress', 'Risk', 'End date'], rows: projects.slice(0, 22).map((item) => [item.name, item.client.name, item.status, pct(item.progress), item.riskLevel, date(item.endDate)]) },
      { title: 'Milestones and resourcing', description: 'Upcoming checkpoints and assigned team members.', columns: ['Project', 'Record', 'Owner / due', 'Status', 'Detail'], rows: projects.flatMap((item) => [
        ...item.milestones.map((milestone) => [item.name, milestone.name, date(milestone.dueDate), milestone.status, clean(milestone.description)]),
        ...item.members.map((member) => [item.name, 'Team assignment', member.user.name, 'ASSIGNED', member.user.role]),
      ]).slice(0, 22) },
    ];
    context = JSON.stringify({ metrics, highlights, projects: sections[0].rows, delivery: sections[1].rows });
  } else {
    const users = await prisma.user.findMany({ where: { orgId, role: { in: ['admin', 'member'] } }, include: { projectMembers: { include: { project: true } }, clientTasks: { include: { client: true } } }, orderBy: { name: 'asc' }, take: 50 });
    const tasks = users.flatMap((item) => item.clientTasks);
    const completed = tasks.filter((item) => item.status === 'COMPLETED').length;
    metrics = [
      { label: 'Team size', value: String(users.length), detail: 'Admins and members' },
      { label: 'Assigned projects', value: String(users.reduce((sum, item) => sum + item.projectMembers.length, 0)), detail: 'Total assignments' },
      { label: 'Assigned tasks', value: String(tasks.length), detail: `${completed} completed` },
      { label: 'Task completion', value: tasks.length ? pct(completed / tasks.length * 100) : 'N/A', detail: 'Current workload' },
    ];
    highlights = users.slice(0, 3).map((item) => `${item.name} is assigned to ${item.projectMembers.length} projects and ${item.clientTasks.filter((task) => task.status !== 'COMPLETED').length} open tasks.`);
    sections = [
      { title: 'Team roster and capacity', description: 'Role, project coverage, and assigned delivery workload.', columns: ['Team member', 'Role', 'Email', 'Projects', 'Open tasks'], rows: users.slice(0, 22).map((item) => [item.name, item.role, item.email, String(item.projectMembers.length), String(item.clientTasks.filter((task) => task.status !== 'COMPLETED').length)]) },
      { title: 'Assignment breakdown', description: 'Granular project and task ownership by team member.', columns: ['Team member', 'Assignment', 'Client / project', 'Status', 'Progress'], rows: users.flatMap((item) => [
        ...item.projectMembers.map((membership) => [item.name, 'Project', membership.project.name, membership.project.status, pct(membership.project.progress)]),
        ...item.clientTasks.map((task) => [item.name, task.title, task.client.name, task.status, pct(task.progress)]),
      ]).slice(0, 22) },
    ];
    context = JSON.stringify({ metrics, highlights, roster: sections[0].rows, assignments: sections[1].rows });
  }

  const requestedTitle = request?.title?.trim();
  const requestedFocus = request?.focus?.trim();
  const title = requestedTitle || titleFor(kind, clientName);
  const narrative = await atlasNarrative({
    enabled: organization.aiSharingConsent && entitlementsFor(organization.plan).aiFeatures,
    title,
    kind,
    context,
    metrics,
    highlights,
    focus: requestedFocus,
    tokenBudget: { orgId, userId, userRole, plan: normalizePlan(organization.plan) },
  });
  const recommendations = highlights.slice(0, 3).map((item, index) => `${index + 1}. Review the supporting records for this signal: ${item}`);
  return {
    version: 1,
    kind,
    title,
    generatedAt: new Date().toISOString(),
    periodLabel: 'Current workspace snapshot',
    ...(clientId ? { clientId, clientName } : {}),
    ...(requestedFocus ? { requestedFocus } : {}),
    atlasNarrative: narrative,
    metrics,
    highlights,
    sections,
    recommendations,
    methodology: 'Generated by Miles Reports from the organization-scoped IrisOS database. Values reflect the current stored snapshot at generation time. Provider-reported marketing metrics may differ from later attribution updates.',
  };
}

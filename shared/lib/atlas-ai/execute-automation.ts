import 'server-only';

import { prisma } from '@/lib/db';
import {
  createAndSendProformaInvoice,
  createAndSendProjectInvoice,
} from '@/lib/invoices/service';
import { parseProjectCommercials } from '@/lib/projects/commercial';
import { normalizeProjectStageColor } from '@/lib/projects/stages';
import { buildAtlasReportDocument } from '@/lib/reports/data';
import type { ReportKind } from '@/lib/reports/types';
import type { AtlasTokenBudgetContext } from './token-budget';
import type { AutomationWorkflowState } from './automation-workflow';

export class AtlasAutomationExecutionError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = 'AtlasAutomationExecutionError';
  }
}

function dateValue(value: string, label: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime())) {
    throw new AtlasAutomationExecutionError(`${label} must be a valid date.`);
  }
  return date;
}

function exactName<T extends { name: string }>(items: T[], name: string, label: string) {
  const matches = items.filter((item) => item.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (matches.length !== 1) {
    throw new AtlasAutomationExecutionError(
      matches.length ? `${label} "${name}" is ambiguous.` : `${label} "${name}" was not found in this workspace.`,
    );
  }
  return matches[0];
}

export function reportKindForAutomation(reportType: string, reportFocus = ''): ReportKind {
  const explicitType = reportType.trim().toUpperCase();
  if (/\b(FINANCIAL|FINANCE|EXECUTIVE)\b/.test(explicitType)) return 'EXECUTIVE';
  if (/\b(MARKETING|CAMPAIGN|ADVERTISING|ADS|CREATIVE)\b/.test(explicitType)) return 'MARKETING';
  if (/\b(LEAD|LEADS|PIPELINE|SALES)\b/.test(explicitType)) return 'LEADS';
  if (/\b(CLIENT|CLIENTS|ACCOUNT|ACCOUNTS|CUSTOMER|CUSTOMERS)\b/.test(explicitType)) return 'CLIENTS';
  if (/\b(PROJECT|PROJECTS|OPERATIONS|DELIVERY|MILESTONE|MILESTONES)\b/.test(explicitType)) return 'PROJECTS';
  if (/\b(TEAM|CAPACITY|RESOURCE|RESOURCING|WORKLOAD|PEOPLE)\b/.test(explicitType)) return 'TEAM';

  const description = reportFocus.toUpperCase();
  if (/\b(MARKETING|CAMPAIGN|ADVERTISING|ADS|CREATIVE)\b/.test(description)) return 'MARKETING';
  if (/\b(LEAD|LEADS|PIPELINE|SALES)\b/.test(description)) return 'LEADS';
  if (/\b(CLIENT|CLIENTS|ACCOUNT|ACCOUNTS|CUSTOMER|CUSTOMERS)\b/.test(description)) return 'CLIENTS';
  if (/\b(PROJECT|PROJECTS|OPERATIONS|DELIVERY|MILESTONE|MILESTONES)\b/.test(description)) return 'PROJECTS';
  if (/\b(TEAM|CAPACITY|RESOURCE|RESOURCING|WORKLOAD|PEOPLE)\b/.test(description)) return 'TEAM';
  return 'EXECUTIVE';
}

export async function executeAtlasAutomation(input: {
  state: AutomationWorkflowState;
  orgId: string;
  userId: string;
  baseUrl: string;
  workspaceContext: string;
  tokenBudget: AtlasTokenBudgetContext;
  automationKey?: string;
}) {
  const { state } = input;
  const draft = state.draft;

  if (state.kind === 'PROJECT') {
    const clients = await prisma.client.findMany({
      where: { orgId: input.orgId },
      select: { id: true, name: true },
    });
    const client = exactName(clients, draft.clientName, 'Client');
    const startDate = dateValue(draft.startDate, 'Start date');
    const endDate = dateValue(draft.endDate, 'End date');
    if (endDate < startDate) throw new AtlasAutomationExecutionError('Project end date must be after its start date.');
    const commercials = parseProjectCommercials({
      paymentType: draft.paymentType,
      paymentAmount: draft.paymentAmount,
      paymentFrequency: draft.paymentFrequency,
      paymentStartDate: draft.paymentStartDate,
      paymentTerms: draft.paymentTerms,
    });
    if (commercials.error || !commercials.data) {
      throw new AtlasAutomationExecutionError(commercials.error || 'Project commercials are invalid.');
    }
    const stageNames = ['Discovery & Plan', 'Execution', 'Review', 'Delivery'];
    const duration = endDate.getTime() - startDate.getTime();
    const project = await prisma.project.create({
      data: {
        name: draft.name,
        status: 'NOT_STARTED',
        startDate,
        endDate,
        progress: 0,
        riskLevel: 'LOW',
        timeline: `${Math.max(1, Math.ceil(duration / 86_400_000))} days`,
        serviceLine: draft.serviceLine,
        ...commercials.data,
        orgId: input.orgId,
        clientId: client.id,
        stages: {
          create: stageNames.map((name, position) => ({
            name,
            position,
            color: normalizeProjectStageColor(undefined, position),
          })),
        },
      },
      include: { stages: { orderBy: { position: 'asc' } } },
    });
    if (draft.deliverables.length) {
      await prisma.clientTask.createMany({
        data: draft.deliverables.map((title) => ({
          title,
          description: `Initial deliverable for project: ${project.name}`,
          status: 'TODO',
          progress: 0,
          clientId: client.id,
          projectId: project.id,
          stageId: project.stages[0]?.id,
        })),
      });
    }
    return {
      message: `Project **${project.name}** was created for **${client.name}**${draft.deliverables.length ? ` with ${draft.deliverables.length} initial task${draft.deliverables.length === 1 ? '' : 's'}` : ''}.`,
      entity: { type: 'project', id: project.id, href: '/projects' },
      invalidateTags: ['projects', 'tasks', 'clients', 'finance', 'dashboard', 'operations'],
    };
  }

  if (state.kind === 'TASK') {
    const projects = await prisma.project.findMany({
      where: { orgId: input.orgId },
      select: { id: true, name: true, clientId: true, stages: { orderBy: { position: 'asc' }, take: 1 } },
    });
    const project = exactName(projects, draft.projectName, 'Project');
    const team = draft.assigneeName
      ? await prisma.user.findMany({ where: { orgId: input.orgId }, select: { id: true, name: true } })
      : [];
    const assignee = draft.assigneeName ? exactName(team, draft.assigneeName, 'Assignee') : null;
    const task = await prisma.clientTask.create({
      data: {
        title: draft.title,
        description: draft.description || null,
        status: 'TODO',
        progress: 0,
        deadline: dateValue(draft.deadline, 'Deadline'),
        clientId: project.clientId,
        projectId: project.id,
        stageId: project.stages[0]?.id,
        assignedToId: assignee?.id || null,
      },
    });
    return {
      message: `Task **${task.title}** was created in **${project.name}**${assignee ? ` and assigned to **${assignee.name}**` : ''}.`,
      entity: { type: 'task', id: task.id, href: `/tasks?projectId=${project.id}` },
      invalidateTags: ['tasks', 'projects', 'team', 'dashboard', 'operations'],
    };
  }

  if (state.kind === 'INVOICE') {
    const isProforma = draft.invoiceDocumentType.toUpperCase() === 'PROFORMA';
    if (isProforma) {
      const leads = await prisma.agencyLead.findMany({
        where: { orgId: input.orgId },
        select: { id: true, fullName: true, email: true },
      });
      const normalizedLeadName = draft.leadName.trim().toLowerCase();
      const leadMatches = leads.filter((lead) =>
        lead.fullName.trim().toLowerCase() === normalizedLeadName
        || lead.email.trim().toLowerCase() === normalizedLeadName
      );
      if (leadMatches.length !== 1) {
        throw new AtlasAutomationExecutionError(
          leadMatches.length
            ? `Lead "${draft.leadName}" is ambiguous.`
            : `Lead "${draft.leadName}" was not found in this workspace.`,
        );
      }
      const lead = leadMatches[0];
      const issuedDate = dateValue(draft.invoiceIssuedDate, 'Issue date');
      const validUntil = draft.invoiceValidUntil
        ? dateValue(draft.invoiceValidUntil, 'Valid-until date')
        : undefined;
      if (validUntil && validUntil < issuedDate) {
        throw new AtlasAutomationExecutionError('The proforma valid-until date cannot be before its issue date.');
      }
      const invoice = await createAndSendProformaInvoice({
        orgId: input.orgId,
        leadId: lead.id,
        baseUrl: input.baseUrl,
        invoiceType: 'STANDARD',
        description: draft.description || undefined,
        termsOfSale: draft.termsOfSale || undefined,
        lineItems: draft.invoiceItems,
        taxRate: Number(draft.invoiceTaxRate),
        invoiceNumber: draft.invoiceNumber,
        issuedDate,
        validUntil,
        referenceName: draft.invoiceReferenceName,
        recipient: {
          name: lead.fullName,
          email: lead.email,
        },
        buyerSnapshot: {
          name: lead.fullName,
          legalEntityName: draft.customerLegalName || lead.fullName,
          email: lead.email.toLowerCase(),
          addressLine1: draft.customerAddressLine1,
          addressLine2: draft.customerAddressLine2,
          city: draft.customerCity,
          state: draft.customerState,
          postalCode: draft.customerPostalCode,
          country: draft.customerCountry,
          gstNumber: draft.customerGstNumber.toUpperCase(),
        },
        automationKey: input.automationKey,
        source: 'ATLAS_AI',
      });
      return {
        message: `Proforma invoice **${invoice.invoiceNumber}** was created for lead **${lead.fullName}** and delivery status is **${invoice.deliveryStatus.toLowerCase()}**. [Open or download the invoice PDF](/api/invoices/${invoice.id}/pdf).`,
        entity: { type: 'invoice', id: invoice.id, href: '/invoices' },
        invalidateTags: ['invoices', 'finance', 'clients', 'dashboard'],
      };
    }
    const projects = await prisma.project.findMany({
      where: { orgId: input.orgId },
      select: { id: true, name: true },
    });
    const project = exactName(projects, draft.projectName, 'Project');
    const invoice = await createAndSendProjectInvoice({
      projectId: project.id,
      orgId: input.orgId,
      baseUrl: input.baseUrl,
      description: draft.description || undefined,
      invoiceType: 'TAX',
      termsOfSale: draft.termsOfSale || undefined,
      lineItems: draft.invoiceItems.length ? draft.invoiceItems : undefined,
      taxRate: draft.invoiceItems.length ? Number(draft.invoiceTaxRate) : undefined,
      automationKey: input.automationKey,
      source: 'ATLAS_AI',
    });
    return {
      message: `Invoice **${invoice.invoiceNumber}** was created for **${project.name}** and delivery status is **${invoice.deliveryStatus.toLowerCase()}**. [Open or download the invoice PDF](/api/invoices/${invoice.id}/pdf).`,
      entity: { type: 'invoice', id: invoice.id, href: '/invoices' },
      invalidateTags: ['invoices', 'finance', 'projects', 'clients', 'dashboard'],
    };
  }

  const reportKind = reportKindForAutomation(draft.reportType, draft.reportFocus);
  const document = await buildAtlasReportDocument(
    input.orgId,
    input.userId,
    input.tokenBudget.userRole,
    reportKind,
    undefined,
    { title: draft.title, focus: draft.reportFocus },
  );
  const report = await prisma.report.create({
    data: {
      title: document.title,
      type: document.kind,
      status: 'READY',
      summary: JSON.stringify(document),
      filePath: 'DYNAMIC_PDF_V1',
      createdById: input.userId,
      orgId: input.orgId,
    },
  });
  return {
    message: `Report **${report.title}** was generated and saved to Executive Reporting. [Open or download the report PDF](/api/reports/${report.id}/pdf).`,
    entity: { type: 'report', id: report.id, href: '/reporting' },
    invalidateTags: ['reports', 'reporting', 'dashboard'],
  };
}

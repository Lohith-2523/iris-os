import { z } from 'zod';

export const automationKinds = ['PROJECT', 'TASK', 'INVOICE', 'REPORT'] as const;
export type AutomationKind = (typeof automationKinds)[number];

export const automationDraftSchema = z.object({
  name: z.string().trim().max(200).default(''),
  title: z.string().trim().max(200).default(''),
  clientName: z.string().trim().max(200).default(''),
  projectName: z.string().trim().max(200).default(''),
  description: z.string().trim().max(4_000).default(''),
  serviceLine: z.string().trim().max(200).default(''),
  startDate: z.string().trim().max(10).default(''),
  endDate: z.string().trim().max(10).default(''),
  paymentType: z.string().trim().max(30).default(''),
  paymentAmount: z.string().trim().max(30).default(''),
  paymentFrequency: z.string().trim().max(30).default(''),
  paymentStartDate: z.string().trim().max(10).default(''),
    paymentTerms: z.string().trim().max(1000).default(''),
  deliverables: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  assigneeName: z.string().trim().max(200).default(''),
  deadline: z.string().trim().max(10).default(''),
  reportType: z.string().trim().max(30).default(''),
  reportFocus: z.string().trim().max(1_000).default(''),
  invoiceDocumentType: z.string().trim().max(30).default(''),
  invoiceType: z.string().trim().max(30).default(''),
  invoiceNumber: z.string().trim().max(80).default(''),
  invoiceIssuedDate: z.string().trim().max(10).default(''),
  invoiceValidUntil: z.string().trim().max(10).default(''),
  invoiceReferenceName: z.string().trim().max(200).default(''),
  invoiceTaxRate: z.string().trim().max(10).default('18'),
  leadName: z.string().trim().max(320).default(''),
  customerName: z.string().trim().max(200).default(''),
  customerLegalName: z.string().trim().max(200).default(''),
  customerEmail: z.string().trim().max(320).default(''),
  customerAddressLine1: z.string().trim().max(300).default(''),
  customerAddressLine2: z.string().trim().max(300).default(''),
  customerCity: z.string().trim().max(120).default(''),
  customerState: z.string().trim().max(120).default(''),
  customerPostalCode: z.string().trim().max(40).default(''),
  customerCountry: z.string().trim().max(120).default(''),
  customerGstNumber: z.string().trim().max(80).default(''),
  itemCount: z.string().trim().max(2).default(''),
  termsOfSale: z.string().trim().max(4_000).default(''),
  invoiceItems: z.array(z.object({
    description: z.string().trim().max(300),
    quantity: z.coerce.number().nonnegative(),
    unitPrice: z.coerce.number().nonnegative(),
  })).max(8).default([]),
});

export type AutomationDraft = z.infer<typeof automationDraftSchema>;

export type AutomationWorkflowState = {
  kind: AutomationKind;
  draft: AutomationDraft;
  awaitingConfirmation: boolean;
  decisionMode: boolean;
  decisionRationale: string;
  decisionEvidence: string[];
};

export const geminiAutomationResultSchema = z.object({
  kind: z.enum(['NONE', ...automationKinds]),
  action: z.enum(['COLLECT', 'READY', 'CONFIRM', 'CANCEL']),
  draft: automationDraftSchema,
  reply: z.string().trim().max(1_000),
  decisionMode: z.boolean().default(false),
  decisionRationale: z.string().trim().max(1_500).default(''),
  decisionEvidence: z.array(z.string().trim().min(1).max(300)).max(6).default([]),
});

export type GeminiAutomationResult = z.infer<typeof geminiAutomationResultSchema>;

const CREATE_VERBS = /\b(create|add|make|set up|setup|generate|prepare|draft|build|issue|send|need|want)\b/i;
const AUTOMATION_NOUNS = /\b(project|task|to-?do|invoice|bill|report)\b/i;
const DECISION_DELEGATION = /\b(you decide|decide for me|use your (?:best )?judg(?:e)?ment|use your discretion|as you see fit|whatever (?:you think )?is best|appropriately|necessary changes?|take action|handle it|do what(?:ever)? is best|analy[sz]e (?:the )?data and (?:act|decide|change|fix|improve))\b/i;
const DECISION_ACTION = /\b(change|update|adjust|fix|improve|optimi[sz]e|create|add|make|assign|schedule|generate|act|handle|do)\b/i;

export function isAutomationRequest(query: string) {
  return CREATE_VERBS.test(query) && AUTOMATION_NOUNS.test(query);
}

export function isDecisionAutomationRequest(query: string) {
  return DECISION_DELEGATION.test(query) && DECISION_ACTION.test(query);
}

export function mergeAutomationWorkflow(
  current: Partial<AutomationWorkflowState> | null,
  result: GeminiAutomationResult,
): AutomationWorkflowState | null {
  const kind = result.kind === 'NONE' ? current?.kind : result.kind;
  if (!kind) return null;

  const prior = automationDraftSchema.parse(current?.draft || {});
  const incoming = result.draft;
  const draft = automationDraftSchema.parse(Object.fromEntries(
    Object.entries(incoming).map(([key, value]) => {
      if (Array.isArray(value)) return [key, value.length ? value : (prior[key as keyof AutomationDraft] || [])];
      return [key, value || prior[key as keyof AutomationDraft] || ''];
    }),
  ));

  return {
    kind,
    draft,
    awaitingConfirmation: result.action === 'READY'
      || (Boolean(current?.awaitingConfirmation) && result.action !== 'CANCEL'),
    decisionMode: result.decisionMode || Boolean(current?.decisionMode),
    decisionRationale: result.decisionRationale || current?.decisionRationale || '',
    decisionEvidence: result.decisionEvidence.length
      ? result.decisionEvidence
      : current?.decisionEvidence || [],
  };
}

export function missingAutomationFields(state: AutomationWorkflowState) {
  const { draft } = state;
  const missing: string[] = [];
  if (state.kind === 'PROJECT') {
    if (!draft.name) missing.push('project name');
    if (!draft.clientName) missing.push('client');
    if (!draft.serviceLine) missing.push('service line');
    if (!draft.startDate) missing.push('start date');
    if (!draft.endDate) missing.push('end date');
    if (!draft.paymentType) missing.push('payment type');
    if (!draft.paymentAmount) missing.push('client payment amount');
    if (draft.paymentType.toUpperCase() === 'RETAINER' && !draft.paymentFrequency) {
      missing.push('retainer frequency');
    }
    if (!draft.paymentStartDate) missing.push('invoice date');
  } else if (state.kind === 'TASK') {
    if (!draft.title) missing.push('task title');
    if (!draft.projectName) missing.push('project');
    if (!draft.deadline) missing.push('deadline');
  } else if (state.kind === 'INVOICE') {
    const isProforma = draft.invoiceDocumentType.toUpperCase() === 'PROFORMA';
    if (isProforma) {
      if (!draft.invoiceNumber) missing.push('proforma number');
      if (!draft.invoiceIssuedDate) missing.push('issue date');
      if (!draft.invoiceReferenceName) missing.push('quotation reference');
      if (!draft.description) missing.push('quotation description');
      if (!draft.leadName) missing.push('lead');
      if (!draft.customerAddressLine1) missing.push('customer address');
      if (!draft.customerCity) missing.push('customer city');
      if (!draft.customerState) missing.push('customer state or region');
      if (!draft.customerPostalCode) missing.push('customer postal code');
      if (!draft.customerCountry) missing.push('customer country');
      if (!draft.invoiceTaxRate) missing.push('tax rate');
      if (draft.invoiceItems.length === 0) missing.push('line items with quantity and unit price');
    } else {
      if (!draft.projectName) missing.push('project');
      if (draft.invoiceItems.length > 0 && !draft.invoiceTaxRate) missing.push('tax rate');
    }
  } else if (state.kind === 'REPORT') {
    if (!draft.title) missing.push('report title');
    if (!draft.reportType) missing.push('report type');
    if (!draft.reportFocus) missing.push('report focus');
  }
  return missing;
}

export function automationConfirmationMessage(state: AutomationWorkflowState, currency: string) {
  const { draft } = state;
  const lines = state.decisionMode
    ? [
        `I analyzed the available workspace data and selected this ${state.kind.toLowerCase()} action:`,
        '',
        ...(state.decisionRationale ? [`**Decision rationale:** ${state.decisionRationale}`, ''] : []),
        ...(state.decisionEvidence.length ? ['**Evidence used:**', ...state.decisionEvidence.map((item) => `- ${item}`), ''] : []),
      ]
    : [`I have the ${state.kind.toLowerCase()} ready to create:`, ''];
  if (state.kind === 'PROJECT') {
    lines.push(
      `**Project:** ${draft.name}`,
      `**Client:** ${draft.clientName}`,
      `**Service:** ${draft.serviceLine}`,
      `**Timeline:** ${draft.startDate} to ${draft.endDate}`,
      `**Commercials:** ${draft.paymentType.toLowerCase()}, ${currency} ${draft.paymentAmount}${draft.paymentFrequency ? ` ${draft.paymentFrequency}` : ''}`,
      `**Invoice date:** ${draft.paymentStartDate} · due 14 days later`,
    );
    if (draft.deliverables.length) lines.push(`**Deliverables:** ${draft.deliverables.join(', ')}`);
  } else if (state.kind === 'TASK') {
    lines.push(
      `**Task:** ${draft.title}`,
      `**Project:** ${draft.projectName}`,
      `**Deadline:** ${draft.deadline}`,
      `**Assignee:** ${draft.assigneeName || 'Unassigned'}`,
    );
  } else if (state.kind === 'INVOICE') {
    const isProforma = draft.invoiceDocumentType.toUpperCase() === 'PROFORMA';
    lines.push(
      `**Document:** ${isProforma ? 'Proforma invoice' : 'Invoice'}`,
      `**${isProforma ? 'Lead' : 'Project'}:** ${isProforma ? draft.leadName : draft.projectName}`,
      `**Type:** ${isProforma ? 'Proforma invoice' : 'Tax invoice'}`,
      `**Items:** ${draft.invoiceItems.length || 'Project deliverables'}`,
    );
    if (isProforma) {
      lines.push(
        `**Number:** ${draft.invoiceNumber}`,
        `**Issue date:** ${draft.invoiceIssuedDate}`,
        ...(draft.invoiceValidUntil ? [`**Valid until:** ${draft.invoiceValidUntil}`] : []),
        `**Reference:** ${draft.invoiceReferenceName}`,
      );
    }
    if (draft.invoiceItems.length) {
      lines.push(...draft.invoiceItems.map((item) =>
        `- ${item.description} — ${item.quantity} × ${currency} ${item.unitPrice}`,
      ));
      lines.push(`**Tax on subtotal:** ${draft.invoiceTaxRate}%`);
    } else {
      lines.push('The project value will be divided equally across its deliverables.');
    }
    if (draft.termsOfSale) lines.push(`**Terms and Conditions:** ${draft.termsOfSale}`);
    lines.push('', `${isProforma ? 'The proforma invoice' : 'The invoice'} will be generated and emailed to the client contact.`);
  } else {
    lines.push(
      `**Report:** ${draft.title}`,
      `**Type:** ${draft.reportType.toLowerCase()}`,
      `**Focus:** ${draft.reportFocus}`,
    );
  }
  lines.push('', 'Reply **Confirm** to create it, or tell me what to change.');
  return lines.join('\n');
}

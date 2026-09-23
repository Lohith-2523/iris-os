import 'server-only';

import {
  geminiAutomationResultSchema,
  type AutomationWorkflowState,
} from './automation-workflow';
import {
  estimateInputTokens,
  reserveAtlasTokens,
  settleAtlasTokenReservation,
  type AtlasTokenBudgetContext,
} from './token-budget';

export const GEMINI_AUTOMATION_MODEL = 'gemini-3.5-flash';

type AutomationDirectory = {
  clients: Array<{
    name: string;
    status: string;
    churnRiskScore: number;
    roiMetric: number;
    activeProjects: number;
  }>;
  projects: Array<{
    name: string;
    clientName: string;
    status: string;
    progress: number;
    riskLevel: string;
    riskDescription: string;
    serviceLine: string;
    startDate: string;
    endDate: string;
    paymentType: string;
    paymentAmount: number | null;
    paymentFrequency: string;
    openTasks: number;
    blockedTasks: number;
    assignedTeam: string[];
  }>;
  team: Array<{
    name: string;
    email: string;
    role: string;
    activeTasks: number;
    assignedProjects: number;
  }>;
  leads: Array<{ name: string; email: string; status: string; estimatedValue: number | null }>;
};

export class GeminiAutomationError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = 'GeminiAutomationError';
  }
}

async function callGemini(body: Record<string, unknown>, tokenBudget: AtlasTokenBudgetContext) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiAutomationError('Miles AI automations are not configured.', 503);
  }
  const generationConfig = typeof body.generationConfig === 'object' && body.generationConfig
    ? body.generationConfig as Record<string, unknown>
    : {};
  const requestedOutputTokens = typeof generationConfig.maxOutputTokens === 'number'
    ? generationConfig.maxOutputTokens
    : 2048;
  const maxOutputTokens = Math.max(256, Math.min(8192, Math.floor(requestedOutputTokens)));
  const budgetedBody = {
    ...body,
    generationConfig: { ...generationConfig, maxOutputTokens },
  };
  const serializedBody = JSON.stringify(budgetedBody);
  const reservation = await reserveAtlasTokens({
    ...tokenBudget,
    provider: 'GEMINI',
    input: estimateInputTokens(serializedBody),
    output: maxOutputTokens,
  });
  let response: Response;
  try {
    response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_AUTOMATION_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: serializedBody,
      cache: 'no-store',
    },
    );
  } catch (error) {
    await settleAtlasTokenReservation(reservation, null).catch(() => undefined);
    throw error;
  }
  const payload = await response.json().catch(() => ({})) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    error?: { message?: string };
  };
  if (!response.ok) {
    await settleAtlasTokenReservation(reservation, null);
    console.error('Miles automation provider failed:', response.status, payload.error?.message || 'Unknown error');
    throw new GeminiAutomationError(
      payload.error?.message || 'Miles AI could not continue this automation.',
      response.status >= 400 && response.status < 500 ? 400 : 502,
    );
  }
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('');
  await settleAtlasTokenReservation(reservation, {
    input: payload.usageMetadata?.promptTokenCount ?? estimateInputTokens(serializedBody),
    output: payload.usageMetadata?.candidatesTokenCount ?? estimateInputTokens(text || ''),
  });
  if (!text) throw new GeminiAutomationError('Miles AI returned an empty automation response.');
  return text;
}

export function parseGeminiAutomationResponse(text: string) {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  const parsed = geminiAutomationResultSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

export async function extractAutomationDetailsWithGemini(input: {
  query: string;
  currentState: Partial<AutomationWorkflowState> | null;
  currentDate: string;
  currency: string;
  directory: AutomationDirectory;
  decisionRequested: boolean;
  tokenBudget: AtlasTokenBudgetContext;
}) {
  const prompt = `You are the automation engine inside Miles AI.
This workflow MUST use Gemini 3.5 Flash only. Never mention Gemini or any provider to the user; the product is always called Miles AI.

Identify and collect details for exactly one of PROJECT, TASK, INVOICE, or REPORT.
- Preserve every valid value in CURRENT_STATE unless the user changes it.
- Match client, project, assignee, and lead names only from DIRECTORY. Copy the canonical name exactly. Never invent a workspace entity.
- Dates must be YYYY-MM-DD. Today is ${input.currentDate}.
- PROJECT paymentType is RETAINER or ONE_TIME. paymentFrequency is monthly, quarterly, or yearly. paymentStartDate is the invoice date. Invoice payment is always due 14 days later.
- REPORT reportType is FINANCIAL, MARKETING, FINANCE, CLIENT, OPERATIONS, or CREATIVE.
- INVOICE invoiceDocumentType is INVOICE or PROFORMA. Every payable INVOICE is a TAX invoice; never offer Standard, Retainer, or Final invoice types.
- invoiceTaxRate is one rate applied to the subtotal, defaults to 18, and may only be 0 through 40. Never collect tax per line item.
- Use READY only when all required values are present.
- Use CONFIRM only when CURRENT_STATE is awaiting confirmation and the user clearly confirms.
- Use CANCEL only when the user clearly cancels.
- Otherwise use COLLECT and ask one concise question that gathers the most useful missing values.
- If this is not a creation request and there is no active workflow, use kind NONE.
- DELEGATED_DECISION means the user explicitly asked Miles to use its judgment instead of supplying every detail.
- When DELEGATED_DECISION is true, analyze DIRECTORY and select the single highest-impact safe action supported by this workflow. Prefer a TASK that addresses the highest-risk or blocked active project; use REPORT when no justified record-changing action is available.
- In decision mode, infer missing operational details from verified DIRECTORY evidence instead of asking the user. Use the least-loaded qualified team member, canonical entity names, and a reasonable future deadline. Never invent evidence, entities, amounts, or performance claims.
- Commercial amounts may only be inferred from an existing exact project or a clear comparable-project median in DIRECTORY. Otherwise collect the amount rather than fabricating it.
- An invoice may only be selected when an existing project or lead unambiguously supports it. Never invent line items, customer addresses, or tax details.
- Set decisionMode true only for an explicit delegated decision. Explain the choice in decisionRationale and include 1-6 concise facts from DIRECTORY in decisionEvidence.
- The application always asks for confirmation before writing, including in decision mode.
- Return only JSON matching the schema.

Required values:
PROJECT: name, clientName, serviceLine, startDate, endDate, paymentType, paymentAmount, paymentStartDate (invoice date), and paymentFrequency for retainers.
TASK: title, projectName, deadline.
INVOICE:
  - Project allocation: invoiceDocumentType INVOICE and projectName. The project deliverables determine the line items automatically; do not ask for an item count or invoice subtype.
  - Detailed project tax invoice: invoiceDocumentType INVOICE, projectName, invoiceTaxRate, and invoiceItems with description, quantity, and unitPrice.
  - Lead proforma quotation: select leadName from DIRECTORY.leads. The lead's name, email, and phone are pulled automatically. Collect invoiceNumber, invoiceIssuedDate, invoiceReferenceName, description, customerAddressLine1, customerCity, customerState, customerPostalCode, customerCountry, invoiceTaxRate, and invoiceItems with description, quantity, and unitPrice. invoiceValidUntil, customerLegalName, customerAddressLine2, customerGstNumber, and termsOfSale are optional. Do not resolve or infer a saved client.
  - termsOfSale is always optional.
REPORT: title, reportType, reportFocus.

CURRENCY: ${input.currency}
DELEGATED_DECISION: ${input.decisionRequested}
CURRENT_STATE: ${JSON.stringify(input.currentState || {})}
DIRECTORY: ${JSON.stringify(input.directory)}
USER_MESSAGE: ${input.query}`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          kind: { type: 'STRING', enum: ['NONE', 'PROJECT', 'TASK', 'INVOICE', 'REPORT'] },
          action: { type: 'STRING', enum: ['COLLECT', 'READY', 'CONFIRM', 'CANCEL'] },
          decisionMode: { type: 'BOOLEAN' },
          decisionRationale: { type: 'STRING' },
          decisionEvidence: { type: 'ARRAY', items: { type: 'STRING' } },
          draft: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING' },
              title: { type: 'STRING' },
              clientName: { type: 'STRING' },
              projectName: { type: 'STRING' },
              description: { type: 'STRING' },
              serviceLine: { type: 'STRING' },
              startDate: { type: 'STRING' },
              endDate: { type: 'STRING' },
              paymentType: { type: 'STRING' },
              paymentAmount: { type: 'STRING' },
              paymentFrequency: { type: 'STRING' },
              paymentStartDate: { type: 'STRING' },
              paymentTerms: { type: 'STRING' },
              deliverables: { type: 'ARRAY', items: { type: 'STRING' } },
              assigneeName: { type: 'STRING' },
              deadline: { type: 'STRING' },
              reportType: { type: 'STRING' },
              reportFocus: { type: 'STRING' },
              invoiceDocumentType: { type: 'STRING' },
              invoiceType: { type: 'STRING' },
              invoiceNumber: { type: 'STRING' },
              invoiceIssuedDate: { type: 'STRING' },
              invoiceValidUntil: { type: 'STRING' },
              invoiceReferenceName: { type: 'STRING' },
              invoiceTaxRate: { type: 'STRING' },
              leadName: { type: 'STRING' },
              customerName: { type: 'STRING' },
              customerLegalName: { type: 'STRING' },
              customerEmail: { type: 'STRING' },
              customerAddressLine1: { type: 'STRING' },
              customerAddressLine2: { type: 'STRING' },
              customerCity: { type: 'STRING' },
              customerState: { type: 'STRING' },
              customerPostalCode: { type: 'STRING' },
              customerCountry: { type: 'STRING' },
              customerGstNumber: { type: 'STRING' },
              itemCount: { type: 'STRING' },
              termsOfSale: { type: 'STRING' },
              invoiceItems: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    description: { type: 'STRING' },
                    quantity: { type: 'NUMBER' },
                    unitPrice: { type: 'NUMBER' },
                  },
                  required: ['description', 'quantity', 'unitPrice'],
                },
              },
            },
            required: [
              'name', 'title', 'clientName', 'projectName', 'description', 'serviceLine',
              'startDate', 'endDate', 'paymentType', 'paymentAmount', 'paymentFrequency',
              'paymentStartDate', 'paymentTerms', 'deliverables', 'assigneeName', 'deadline',
              'reportType', 'reportFocus',
              'invoiceDocumentType', 'invoiceType', 'invoiceNumber', 'invoiceIssuedDate',
              'invoiceValidUntil', 'invoiceReferenceName', 'invoiceTaxRate', 'leadName', 'customerName',
              'customerLegalName', 'customerEmail', 'customerAddressLine1', 'customerAddressLine2',
              'customerCity', 'customerState', 'customerPostalCode', 'customerCountry',
              'customerGstNumber', 'itemCount', 'termsOfSale', 'invoiceItems',
            ],
          },
          reply: { type: 'STRING' },
        },
        required: ['kind', 'action', 'draft', 'reply', 'decisionMode', 'decisionRationale', 'decisionEvidence'],
      },
    },
  };
  const text = await callGemini(requestBody, input.tokenBudget);
  const parsed = parseGeminiAutomationResponse(text);
  if (parsed) return parsed;

  const retryText = await callGemini({
    ...requestBody,
    contents: [{ parts: [{
      text: `${prompt}\n\nRETRY_INSTRUCTION: The previous response was incomplete or invalid. Return one complete, compact JSON object. Do not use markdown fences or omit required fields.`,
    }] }],
    generationConfig: {
      ...requestBody.generationConfig,
      temperature: 0,
      maxOutputTokens: 6144,
    },
  }, input.tokenBudget);
  const retried = parseGeminiAutomationResponse(retryText);
  if (!retried) {
    throw new GeminiAutomationError('Miles AI returned incomplete automation details. Please retry the request.');
  }
  return retried;
}

export async function generateReportWithGemini(input: {
  title: string;
  type: string;
  focus: string;
  workspaceContext: string;
  tokenBudget: AtlasTokenBudgetContext;
}) {
  const prompt = `You are Miles AI, an executive reporting system.
Create a polished ${input.type} report titled "${input.title}" focused on: ${input.focus}.
Use only facts present in WORKSPACE_CONTEXT. Never invent figures, clients, or performance claims.
Use concise markdown headings, an executive summary, evidence, risks, and recommended next actions.
Do not mention the underlying model or provider.

WORKSPACE_CONTEXT:
${input.workspaceContext}`;
  return callGemini({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2 },
  }, input.tokenBudget);
}

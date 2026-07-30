import 'server-only';

import {
  geminiAutomationResultSchema,
  type AutomationWorkflowState,
} from './automation-workflow';

export const GEMINI_AUTOMATION_MODEL = 'gemini-3.5-flash';

type AutomationDirectory = {
  clients: Array<{ name: string }>;
  projects: Array<{ name: string; clientName: string }>;
  team: Array<{ name: string; email: string }>;
  leads: Array<{ name: string; email: string }>;
};

export class GeminiAutomationError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = 'GeminiAutomationError';
  }
}

async function callGemini(body: Record<string, unknown>) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiAutomationError('Prism AI automations are not configured.', 503);
  }
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_AUTOMATION_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      cache: 'no-store',
    },
  );
  const payload = await response.json().catch(() => ({})) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };
  if (!response.ok) {
    console.error('Prism automation provider failed:', response.status, payload.error?.message || 'Unknown error');
    throw new GeminiAutomationError(
      payload.error?.message || 'Prism AI could not continue this automation.',
      response.status >= 400 && response.status < 500 ? 400 : 502,
    );
  }
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new GeminiAutomationError('Prism AI returned an empty automation response.');
  return text;
}

export async function extractAutomationDetailsWithGemini(input: {
  query: string;
  currentState: Partial<AutomationWorkflowState> | null;
  currentDate: string;
  currency: string;
  directory: AutomationDirectory;
}) {
  const prompt = `You are the automation engine inside Prism AI.
This workflow MUST use Gemini 3.5 Flash only. Never mention Gemini or any provider to the user; the product is always called Prism AI.

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
CURRENT_STATE: ${JSON.stringify(input.currentState || {})}
DIRECTORY: ${JSON.stringify(input.directory)}
USER_MESSAGE: ${input.query}`;

  const text = await callGemini({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          kind: { type: 'STRING', enum: ['NONE', 'PROJECT', 'TASK', 'INVOICE', 'REPORT'] },
          action: { type: 'STRING', enum: ['COLLECT', 'READY', 'CONFIRM', 'CANCEL'] },
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
        required: ['kind', 'action', 'draft', 'reply'],
      },
    },
  });
  const parsed = geminiAutomationResultSchema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new GeminiAutomationError('Prism AI returned invalid automation details. Please rephrase the request.');
  }
  return parsed.data;
}

export async function generateReportWithGemini(input: {
  title: string;
  type: string;
  focus: string;
  workspaceContext: string;
}) {
  const prompt = `You are Prism AI, an executive reporting system.
Create a polished ${input.type} report titled "${input.title}" focused on: ${input.focus}.
Use only facts present in WORKSPACE_CONTEXT. Never invent figures, clients, or performance claims.
Use concise markdown headings, an executive summary, evidence, risks, and recommended next actions.
Do not mention the underlying model or provider.

WORKSPACE_CONTEXT:
${input.workspaceContext}`;
  return callGemini({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2 },
  });
}

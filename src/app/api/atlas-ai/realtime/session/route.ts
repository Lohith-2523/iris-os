import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/org';
import { normalizePlan } from '@/lib/plan-entitlements';
import { ATLAS_GUIDE_MESSAGES } from '@/lib/atlas-ai/guide';

export const runtime = 'nodejs';

const guide = ATLAS_GUIDE_MESSAGES.map((message) => message.content).join('\n\n');
const voiceActionDetails = [
  'For projects, collect the project name, client, service line, start date, end date, payment type, payment amount, first invoice date, and retainer frequency when applicable.',
  'For tasks, collect the task title, project, and deadline; the assignee is optional.',
  'For standard invoices, collect the project and any custom line items or tax rate the user wants.',
  'For proforma invoices, collect the number, issue date, quotation reference and description, lead, customer address, country, tax rate, and line items with quantity and unit price.',
  'For reports, collect the title, report type, and focus.',
  'For meetings, collect the meeting name, attendees, date, time, and time zone.',
].join(' ');

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (normalizePlan(user.organization.plan) === 'BASIC') {
    return NextResponse.json({ error: 'Atlas voice is not available on the Free plan.' }, { status: 403 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Atlas voice is not configured.' }, { status: 503 });

  const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      session: {
        type: 'realtime',
        model: process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime',
        instructions: `You are Atlas, the voice intelligence inside Iris OS. Speak as a polite, confident 30-year-old British man: professional, concise, warm, and occasionally cheeky without becoming flippant. Address the user as ${user.name || 'there'}. Their agency is ${user.organization.name || 'their Iris workspace'}. Answer naturally for speech, usually in two to five sentences. Respond to a simple greeting with a brief greeting, not a workspace recap or summary. Never produce a report, recap, or summary unless the user asks for one. Never read markdown, URLs, or formatting aloud.\n\nWhen the user asks to create a project, task, invoice, report, or meeting, you alone control the voice workflow: keep the conversation natural and collect every missing detail yourself. Ask one concise question at a time. ${voiceActionDetails} Current date is ${new Date().toISOString().slice(0, 10)}. Dates in tool details must use YYYY-MM-DD, and meeting startLocal must use YYYY-MM-DDTHH:mm. Once all required details are known, briefly recap every proposed action and end with “Say Confirm to continue.” Do not say Confirm before the details are complete. After the user explicitly confirms, call confirm_workspace_actions with one complete entry per action, including a structured details object containing every collected value, ordered so dependencies are created first. The authenticated server validates and executes those exact details without asking another AI model to reinterpret them. Do not speak as though the action succeeded while the tool is running. Never claim that you started, created, updated, sent, scheduled, or deleted a workspace record yourself.\n\nIris product guide:\n${guide}`,
        output_modalities: ['audio'],
        tools: [{
          type: 'function',
          name: 'confirm_workspace_actions',
          description: 'Call exactly once after the user explicitly confirms the final action summary. Include each confirmed workspace action and every collected value in details, in dependency order. Never call while collecting details or before confirmation.',
          parameters: {
            type: 'object',
            additionalProperties: false,
            required: ['confirmed', 'actions'],
            properties: {
              confirmed: { type: 'boolean', enum: [true] },
              actions: {
                type: 'array',
                minItems: 1,
                maxItems: 5,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['kind', 'request', 'details'],
                  properties: {
                    kind: { type: 'string', enum: ['PROJECT', 'TASK', 'INVOICE', 'REPORT', 'MEETING'] },
                    request: { type: 'string', description: 'A complete standalone instruction containing every confirmed detail for this one action.' },
                    details: {
                      type: 'object',
                      description: 'Structured values collected and confirmed by the user. Supply only the fields relevant to this action kind.',
                      properties: {
                        name: { type: 'string' },
                        title: { type: 'string' },
                        clientName: { type: 'string' },
                        projectName: { type: 'string' },
                        description: { type: 'string' },
                        serviceLine: { type: 'string' },
                        startDate: { type: 'string' },
                        endDate: { type: 'string' },
                        paymentType: { type: 'string', enum: ['RETAINER', 'ONE_TIME'] },
                        paymentAmount: { type: 'string' },
                        paymentFrequency: { type: 'string' },
                        paymentStartDate: { type: 'string' },
                        paymentTerms: { type: 'string' },
                        deliverables: { type: 'array', items: { type: 'string' } },
                        assigneeName: { type: 'string' },
                        deadline: { type: 'string' },
                        reportType: { type: 'string' },
                        reportFocus: { type: 'string' },
                        invoiceDocumentType: { type: 'string', enum: ['INVOICE', 'PROFORMA'] },
                        invoiceNumber: { type: 'string' },
                        invoiceIssuedDate: { type: 'string' },
                        invoiceValidUntil: { type: 'string' },
                        invoiceReferenceName: { type: 'string' },
                        invoiceTaxRate: { type: 'string' },
                        leadName: { type: 'string' },
                        customerLegalName: { type: 'string' },
                        customerAddressLine1: { type: 'string' },
                        customerAddressLine2: { type: 'string' },
                        customerCity: { type: 'string' },
                        customerState: { type: 'string' },
                        customerPostalCode: { type: 'string' },
                        customerCountry: { type: 'string' },
                        customerGstNumber: { type: 'string' },
                        termsOfSale: { type: 'string' },
                        invoiceItems: {
                          type: 'array',
                          items: {
                            type: 'object',
                            required: ['description', 'quantity', 'unitPrice'],
                            properties: {
                              description: { type: 'string' },
                              quantity: { type: 'number' },
                              unitPrice: { type: 'number' },
                            },
                          },
                        },
                        attendees: { type: 'array', items: { type: 'string' } },
                        startLocal: { type: 'string' },
                        timeZone: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        }],
        tool_choice: 'auto',
        audio: {
          input: {
            transcription: { model: process.env.OPENAI_REALTIME_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe', language: 'en' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
              create_response: true,
              interrupt_response: true,
            },
          },
          output: { voice: process.env.OPENAI_REALTIME_VOICE || 'cedar' },
        },
      },
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown> & { error?: { message?: string } };
  if (!response.ok) {
    console.error('OpenAI Realtime session creation failed:', response.status, payload.error?.message || 'unknown_error');
    return NextResponse.json({ error: payload.error?.message || 'Atlas could not start voice mode.' }, { status: response.status || 502 });
  }
  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
}

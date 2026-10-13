import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/org';
import { normalizePlan } from '@/lib/plan-entitlements';
import { getAtlasWorkspaceContext } from '@/lib/atlas-ai/workspace-context';
import { canShowAtlasLauncher } from '@/lib/workspace-launchers';
import { ATLAS_GUIDE_MESSAGES } from '@/lib/atlas-ai/guide';
import { milesVoicePersona } from '@/lib/atlas-ai/persona';

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
  if (!user) return NextResponse.json({ error: 'Oops! Please sign in to continue.' }, { status: 401 });
  if (!canShowAtlasLauncher(user.role)) return NextResponse.json({ error: 'Oops! You do not have enough permissions.' }, { status: 403 });
  if (normalizePlan(user.organization.plan) === 'BASIC') {
    return NextResponse.json({ error: 'Miles voice is not available on the Free plan.' }, { status: 403 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Miles voice is not configured.' }, { status: 503 });

  const workspaceContext = await getAtlasWorkspaceContext(user.organization);
  const voicePersona = milesVoicePersona({
    userName: user.name,
    organizationName: user.organization.name,
  });

  const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      session: {
        type: 'realtime',
        model: process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime',
        instructions: `${voicePersona}\n\nWhen the user asks to create a project, task, invoice, report, or meeting, you alone control the voice workflow: keep the conversation natural and collect every missing detail yourself. Ask one concise question at a time. ${voiceActionDetails} Current date is ${new Date().toISOString().slice(0, 10)}. Dates in tool details must use YYYY-MM-DD, and meeting startLocal must use YYYY-MM-DDTHH:mm. Once all required details are known, briefly recap every proposed action and end with “Say Confirm to continue.” Do not say Confirm before the details are complete. After the user explicitly confirms, call confirm_workspace_actions with one complete entry per action, including a structured details object containing every collected value, ordered so dependencies are created first. The authenticated server validates and executes those exact details without asking another AI model to reinterpret them. Do not speak as though the action succeeded while the tool is running. Never claim that you started, created, updated, sent, scheduled, or deleted a workspace record yourself.\n\nIrisOS product guide:\n${guide}\n\nAgency data at the start of this voice session:\n${workspaceContext}\nIf records change during this call, start a new voice session to refresh this snapshot. Never invent missing records.`,
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
            transcription: {
              model: process.env.OPENAI_REALTIME_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe',
              language: 'en',
              prompt: 'Transcribe spoken English only. Preserve English phonetics as English; never translate them into another language. Emit no text for silence, ambient noise, or non-speech sounds.',
            },
            turn_detection: {
              type: 'semantic_vad',
              // Let people pause, spell names, and think aloud. Semantic VAD
              // waits longer when the spoken thought sounds unfinished.
              eagerness: 'low',
              create_response: false,
              interrupt_response: false,
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
    return NextResponse.json({ error: 'Miles could not start voice mode.' }, { status: response.status || 502 });
  }
  const directValue = typeof payload.value === 'string' ? payload.value : '';
  const clientSecret = payload.client_secret && typeof payload.client_secret === 'object'
    ? payload.client_secret as { value?: unknown }
    : null;
  const nestedValue = typeof clientSecret?.value === 'string' ? clientSecret.value : '';
  if (!directValue && !nestedValue) {
    console.error('Miles realtime session response did not include a client secret.');
    return NextResponse.json({ error: 'Miles could not start voice mode.' }, { status: 502 });
  }
  return NextResponse.json(
    directValue ? { value: directValue } : { client_secret: { value: nestedValue } },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

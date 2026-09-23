import 'server-only';

import {
  geminiMeetingResultSchema,
  type MeetingWorkflowState,
} from './meeting-workflow';
import {
  estimateInputTokens,
  reserveAtlasTokens,
  settleAtlasTokenReservation,
  type AtlasTokenBudgetContext,
} from './token-budget';

const GEMINI_MEETING_MODEL = 'gemini-3.5-flash';

type DirectoryEntry = {
  name: string;
  email: string;
  kind: 'team' | 'client';
};

export class GeminiMeetingError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = 'GeminiMeetingError';
  }
}

export async function extractMeetingDetailsWithGemini(input: {
  query: string;
  currentState: Partial<MeetingWorkflowState> | null;
  timeZone: string;
  currentLocalDateTime: string;
  directory: DirectoryEntry[];
  tokenBudget: AtlasTokenBudgetContext;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiMeetingError('Gemini meeting assistance is not configured.', 503);
  }

  const prompt = `You are the dedicated Gemini meeting coordinator inside IrisOS.
This workflow MUST use Gemini only. Never delegate or mention another model.

Collect exactly these meeting details:
1. meeting name
2. attendee email addresses
3. meeting date and start time

Rules:
- Preserve valid values already in CURRENT_STATE unless the user changes them.
- Resolve attendee names to email addresses only from DIRECTORY. Never invent an email.
- If a named attendee is absent or ambiguous, leave attendees incomplete and ask for their email.
- Output startLocal as YYYY-MM-DDTHH:mm in ${input.timeZone}.
- Current local date/time is ${input.currentLocalDateTime}.
- Meetings last 30 minutes by default.
- Use action READY only when all three details are present and the user has not explicitly confirmed yet.
- Use action CONFIRM only when CURRENT_STATE was awaiting confirmation and the user clearly confirms.
- Use action CANCEL only when the user clearly cancels.
- Otherwise use action COLLECT and ask one concise question for the missing or ambiguous details.
- Return only JSON matching the supplied schema.

CURRENT_STATE:
${JSON.stringify(input.currentState || {})}

DIRECTORY:
${JSON.stringify(input.directory)}

USER_MESSAGE:
${input.query}`;

  const reservation = await reserveAtlasTokens({
    ...input.tokenBudget,
    provider: 'GEMINI',
    input: estimateInputTokens(prompt),
    output: 1024,
  });
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MEETING_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING' },
                attendees: { type: 'ARRAY', items: { type: 'STRING' } },
                startLocal: { type: 'STRING' },
                action: { type: 'STRING', enum: ['COLLECT', 'READY', 'CONFIRM', 'CANCEL'] },
                reply: { type: 'STRING' },
              },
              required: ['title', 'attendees', 'startLocal', 'action', 'reply'],
            },
          },
        }),
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
    console.error('Gemini meeting workflow failed:', response.status, payload.error?.message || 'Unknown error');
    throw new GeminiMeetingError(
      payload.error?.message || 'Gemini could not continue the meeting conversation.',
      response.status >= 400 && response.status < 500 ? 400 : 502,
    );
  }

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  await settleAtlasTokenReservation(reservation, {
    input: payload.usageMetadata?.promptTokenCount ?? estimateInputTokens(prompt),
    output: payload.usageMetadata?.candidatesTokenCount ?? estimateInputTokens(text || ''),
  });
  if (!text) throw new GeminiMeetingError('Gemini returned an empty meeting response.');

  const parsedJson = JSON.parse(text);
  const parsed = geminiMeetingResultSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new GeminiMeetingError('Gemini returned invalid meeting details. Please rephrase the request.');
  }
  return { ...parsed.data, model: GEMINI_MEETING_MODEL };
}

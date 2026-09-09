import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/org';
import { normalizePlan } from '@/lib/plan-entitlements';
import { ATLAS_GUIDE_MESSAGES } from '@/lib/atlas-ai/guide';

export const runtime = 'nodejs';

const guide = ATLAS_GUIDE_MESSAGES.map((message) => message.content).join('\n\n');

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (normalizePlan(user.organization.plan) === 'BASIC') {
    return NextResponse.json({ error: 'Atlas voice is not available on the Basic plan.' }, { status: 403 });
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
        instructions: `You are Atlas, the voice intelligence inside Iris OS. Speak as a polite, confident 30-year-old British man: professional, concise, warm, and occasionally cheeky without becoming flippant. Address the user as ${user.name || 'there'}. Their agency is ${user.organization.name || 'their Iris workspace'}. Answer naturally for speech, usually in two to five sentences. Never read markdown, URLs, or formatting aloud. Do not claim you changed workspace records unless a confirmed Iris workflow actually did so.\n\nIris product guide:\n${guide}`,
        output_modalities: ['audio'],
        audio: {
          input: {
            transcription: { model: process.env.OPENAI_REALTIME_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe', language: 'en' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.35,
              prefix_padding_ms: 300,
              silence_duration_ms: 450,
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

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/org';
import { entitlementsFor, normalizePlan } from '@/lib/plan-entitlements';
import { hasMeaningfulEnglishSpeech } from '@/lib/atlas-ai/voice-input';
import {
  AtlasTokenLimitError,
  reserveAtlasTokens,
  settleAtlasTokenReservation,
} from '@/lib/atlas-ai/token-budget';

export const runtime = 'nodejs';

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const ALLOWED_AUDIO_TYPES = new Set([
  'audio/flac',
  'audio/m4a',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
]);

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Oops! Please sign in to continue.' }, { status: 401 });
  if (!entitlementsFor(user.organization.plan).aiFeatures) {
    return NextResponse.json({ error: 'Oops! You do not have enough permissions to use Miles AI.' }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'A recorded audio file is required.' }, { status: 400 });
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'Recordings must be smaller than 20 MB.' }, { status: 413 });
  }
  const audioType = file.type.toLowerCase().split(';', 1)[0];
  if (audioType && !ALLOWED_AUDIO_TYPES.has(audioType)) {
    return NextResponse.json({ error: 'This audio format is not supported.' }, { status: 415 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('Miles voice transcription is unavailable because OPENAI_API_KEY is not configured.');
    return NextResponse.json({ error: 'Oops! Something went wrong. Please try again.' }, { status: 503 });
  }

  const model = process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe';
  // Opus/WebM recordings generally contain far more encoded bytes than model
  // tokens. Reserve from file size so quota is checked before provider spend,
  // then reconcile to OpenAI's actual token usage below.
  let reservation;
  try {
    reservation = await reserveAtlasTokens({
      orgId: user.orgId,
      userId: user.id,
      userRole: user.role,
      plan: normalizePlan(user.organization.plan),
      provider: 'GPT',
      input: Math.max(256, Math.ceil(file.size / 512)),
      output: Math.max(128, Math.ceil(file.size / 2_048)),
    });
  } catch (error) {
    if (error instanceof AtlasTokenLimitError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
  const providerForm = new FormData();
  providerForm.append('file', file, file.name || 'atlas-recording.webm');
  providerForm.append('model', model);
  providerForm.append('language', 'en');
  providerForm.append('prompt', 'Transcribe spoken English only. Preserve English words as English and do not translate them into another language. Return no text for silence, ambient noise, or audio without intelligible English speech.');

  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: providerForm,
      cache: 'no-store',
    });
  } catch (error) {
    await settleAtlasTokenReservation(reservation, null).catch(() => undefined);
    console.error('Miles voice transcription request failed.', error);
    return NextResponse.json({ error: 'Oops! Something went wrong. Please try again.' }, { status: 502 });
  }
  const result = await response.json().catch(() => ({})) as {
    text?: unknown;
    error?: { message?: unknown };
    usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
  };
  if (!response.ok || typeof result.text !== 'string') {
    await settleAtlasTokenReservation(reservation, null);
    const providerMessage = typeof result.error?.message === 'string' ? result.error.message : 'The recording could not be transcribed.';
    console.error('Miles voice transcription provider rejected the recording.', { status: response.status, providerMessage });
    return NextResponse.json({ error: 'Oops! Something went wrong. Please try again.' }, { status: response.status || 502 });
  }

  const transcript = result.text.trim();
  await settleAtlasTokenReservation(reservation, {
    input: result.usage?.input_tokens ?? Math.max(1, Math.ceil(file.size / 512)),
    output: result.usage?.output_tokens ?? Math.max(1, Math.ceil(Buffer.byteLength(transcript, 'utf8') / 4)),
  });
  return NextResponse.json({ text: hasMeaningfulEnglishSpeech(transcript) ? transcript : '', model });
}

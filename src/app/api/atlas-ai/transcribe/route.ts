import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/org';
import { normalizePlan } from '@/lib/plan-entitlements';
import { hasMeaningfulEnglishSpeech } from '@/lib/atlas-ai/voice-input';

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
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (normalizePlan(user.organization.plan) === 'BASIC') {
    return NextResponse.json({ error: 'Miles AI is not available on the Free plan.' }, { status: 403 });
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
    return NextResponse.json({ error: 'Voice transcription is not configured.' }, { status: 503 });
  }

  const model = process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe';
  const providerForm = new FormData();
  providerForm.append('file', file, file.name || 'atlas-recording.webm');
  providerForm.append('model', model);
  providerForm.append('language', 'en');
  providerForm.append('prompt', 'Transcribe spoken English only. Preserve English words as English and do not translate them into another language. Return no text for silence, ambient noise, or audio without intelligible English speech.');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: providerForm,
    cache: 'no-store',
  });
  const result = await response.json().catch(() => ({})) as { text?: unknown; error?: { message?: unknown } };
  if (!response.ok || typeof result.text !== 'string') {
    const providerMessage = typeof result.error?.message === 'string' ? result.error.message : 'The recording could not be transcribed.';
    return NextResponse.json({ error: providerMessage }, { status: response.status || 502 });
  }

  const transcript = result.text.trim();
  return NextResponse.json({ text: hasMeaningfulEnglishSpeech(transcript) ? transcript : '', model });
}

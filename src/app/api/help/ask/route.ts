import { NextResponse } from 'next/server';
import { ATLAS_GUIDE_MESSAGES } from '@/lib/atlas-ai/guide';

export const runtime = 'nodejs';

const PRODUCT_CONTEXT = ATLAS_GUIDE_MESSAGES.map((message) => message.content).join('\n\n');

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { question?: unknown } | null;
  const question = typeof body?.question === 'string' ? body.question.trim().slice(0, 2_000) : '';
  if (!question) return NextResponse.json({ error: 'Ask a question about IrisOS.' }, { status: 400 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Miles help is not configured.' }, { status: 503 });

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_HELP_MODEL || 'gpt-5.4',
      instructions: `You are Miles, the IrisOS product guide. Answer only questions about using IrisOS. Be concise, accurate, polite, professional, and lightly cheeky when appropriate. Never invent unavailable features. Product guide:\n\n${PRODUCT_CONTEXT}`,
      input: question,
      max_output_tokens: 700,
    }),
    cache: 'no-store',
  });
  const result = await response.json().catch(() => ({})) as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; error?: { message?: string } };
  const answer = result.output_text || result.output?.flatMap((item) => item.content || []).find((item) => item.type === 'output_text')?.text;
  if (!response.ok || !answer) {
    console.error('Miles help provider failed:', response.status, result.error?.message || 'empty_response');
    return NextResponse.json({ error: 'Miles could not answer right now.' }, { status: response.status || 502 });
  }
  return NextResponse.json({ answer });
}

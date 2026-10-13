import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRequestUser } from '@/lib/org';
import { normalizePlan } from '@/lib/plan-entitlements';
import {
  AtlasTokenLimitError,
  recordAtlasTokenUsage,
} from '@/lib/atlas-ai/token-budget';
import { canShowAtlasLauncher } from '@/lib/workspace-launchers';

export const runtime = 'nodejs';

const realtimeUsageSchema = z.object({
  eventId: z.string().trim().min(1).max(200),
  inputCredits: z.number().int().min(0).max(1_000_000),
  outputCredits: z.number().int().min(0).max(1_000_000),
}).strict().refine((value) => value.inputCredits + value.outputCredits > 0, {
  message: 'A positive usage total is required.',
});

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Oops! Please sign in to continue.' }, { status: 401 });
  if (!canShowAtlasLauncher(user.role)) {
    return NextResponse.json({ error: 'Oops! You do not have enough permissions.' }, { status: 403 });
  }

  const parsed = realtimeUsageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid realtime usage.' }, { status: 400 });

  try {
    await recordAtlasTokenUsage({
      orgId: user.orgId,
      userId: user.id,
      userRole: user.role,
      plan: normalizePlan(user.organization.plan),
      provider: 'GPT',
      input: parsed.data.inputCredits,
      output: parsed.data.outputCredits,
    });
    return NextResponse.json({ recorded: true, eventId: parsed.data.eventId });
  } catch (error) {
    if (error instanceof AtlasTokenLimitError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Unable to record Miles realtime usage:', error);
    return NextResponse.json({ error: 'Miles could not record realtime usage.' }, { status: 500 });
  }
}

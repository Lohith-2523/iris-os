import { NextRequest, NextResponse } from 'next/server';
import { getAtlasTokenUsage } from '@/lib/atlas-ai/token-budget';
import { getRequestUser } from '@/lib/org';
import { entitlementsFor, normalizePlan } from '@/lib/plan-entitlements';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const plan = normalizePlan(user.organization.plan);
  const limits = entitlementsFor(plan).atlasTokenLimits;
  const usage = await getAtlasTokenUsage(user.orgId);
  if (!usage) return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 });

  const remaining = limits ? {
    total: Math.max(0, limits.total - usage.total),
    input: Math.max(0, limits.input - usage.input),
    output: Math.max(0, limits.output - usage.output),
    providers: {
      GEMINI: Math.max(0, limits.providers.GEMINI - usage.providers.GEMINI),
      GPT: Math.max(0, limits.providers.GPT - usage.providers.GPT),
      CLAUDE: Math.max(0, limits.providers.CLAUDE - usage.providers.CLAUDE),
    },
  } : null;

  return NextResponse.json({ plan, limits, usage, remaining });
}

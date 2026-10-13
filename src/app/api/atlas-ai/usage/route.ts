import { NextRequest, NextResponse } from 'next/server';
import { getAtlasTokenUsage } from '@/lib/atlas-ai/token-budget';
import { getRequestUser } from '@/lib/org';
import { entitlementsFor, normalizePlan } from '@/lib/plan-entitlements';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Oops! Please sign in to continue.' }, { status: 401 });

  const plan = normalizePlan(user.organization.plan);
  const limits = entitlementsFor(plan).atlasTokenLimits;
  const usage = await getAtlasTokenUsage(user.orgId);
  if (!usage) return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 });

  const publicLimits = limits ? {
    total: limits.total,
    input: limits.input,
    output: limits.output,
  } : null;
  const publicUsage = {
    total: usage.total,
    input: usage.input,
    output: usage.output,
    periodStart: usage.periodStart,
    resetsAt: usage.resetsAt,
  };
  const remaining = limits ? {
    total: Math.max(0, limits.total - usage.total),
    input: Math.max(0, limits.input - usage.input),
    output: Math.max(0, limits.output - usage.output),
  } : null;

  return NextResponse.json({ plan, limits: publicLimits, usage: publicUsage, remaining });
}

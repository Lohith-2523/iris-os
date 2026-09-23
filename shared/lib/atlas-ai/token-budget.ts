import 'server-only';

import { prisma } from '@/lib/db';
import {
  entitlementsFor,
  normalizePlan,
  type AtlasProvider,
  type PlanId,
} from '@/lib/plan-entitlements';

type TokenUsage = {
  input: number;
  output: number;
};

export type AtlasTokenBudgetContext = {
  orgId: string;
  userId: string;
  userRole: string;
  plan: PlanId;
};

export type AtlasTokenReservation = AtlasTokenBudgetContext & TokenUsage & {
  provider: AtlasProvider;
  periodStart: Date;
};

export class AtlasTokenLimitError extends Error {
  readonly status = 429;

  constructor(readonly dimension: 'total' | 'input' | 'output' | 'provider', plan?: PlanId) {
    super(plan === 'BASIC'
      ? 'This workspace has used all of its monthly Miles AI credits. Upgrade to Pro or Advanced for more credits.'
      : plan === 'PRO'
        ? 'This workspace has used all of its monthly Miles AI credits. Upgrade to Advanced for more credits.'
        : 'This workspace has used all of its monthly Miles AI credits. Credits reset at the start of the next month.');
    this.name = 'AtlasTokenLimitError';
  }
}

export function atlasUsagePeriod(now = new Date()) {
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const resetsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { periodStart, resetsAt };
}

async function ensureCurrentAtlasUsagePeriod(orgId: string, now = new Date()) {
  const { periodStart, resetsAt } = atlasUsagePeriod(now);
  await prisma.organization.updateMany({
    where: {
      id: orgId,
      OR: [
        { atlasUsagePeriodStart: { lt: periodStart } },
        { atlasUsagePeriodStart: { gte: resetsAt } },
      ],
    },
    data: {
      atlasUsagePeriodStart: periodStart,
      atlasInputTokensUsed: 0,
      atlasOutputTokensUsed: 0,
      atlasTotalTokensUsed: 0,
      atlasGeminiTokensUsed: 0,
      atlasGptTokensUsed: 0,
      atlasClaudeTokensUsed: 0,
    },
  });
  return { periodStart, resetsAt };
}

export function estimateInputTokens(...values: string[]) {
  const bytes = values.reduce((total, value) => total + Buffer.byteLength(value, 'utf8'), 0);
  // One token cannot encode less than one byte. Reserving by byte count is a
  // conservative upper bound and is reconciled to provider-reported usage.
  return Math.max(1, bytes);
}

function providerCounter(provider: AtlasProvider) {
  if (provider === 'GEMINI') return 'atlasGeminiTokensUsed' as const;
  if (provider === 'GPT') return 'atlasGptTokensUsed' as const;
  return 'atlasClaudeTokensUsed' as const;
}

export async function reserveAtlasTokens(input: AtlasTokenBudgetContext & TokenUsage & { provider: AtlasProvider }) {
  const plan = normalizePlan(input.plan);
  const limits = entitlementsFor(plan).atlasTokenLimits;
  if (!limits) throw new AtlasTokenLimitError('total', plan);

  const requestedInput = Math.max(0, Math.ceil(input.input));
  const requestedOutput = Math.max(0, Math.ceil(input.output));
  const requestedTotal = requestedInput + requestedOutput;
  const providerField = providerCounter(input.provider);
  const providerLimit = limits.providers[input.provider];
  const { periodStart } = await ensureCurrentAtlasUsagePeriod(input.orgId);

  const updated = await prisma.organization.updateMany({
    where: {
      id: input.orgId,
      atlasUsagePeriodStart: periodStart,
      atlasInputTokensUsed: { lte: limits.input - requestedInput },
      atlasOutputTokensUsed: { lte: limits.output - requestedOutput },
      atlasTotalTokensUsed: { lte: limits.total - requestedTotal },
      [providerField]: { lte: providerLimit - requestedTotal },
    },
    data: {
      atlasInputTokensUsed: { increment: requestedInput },
      atlasOutputTokensUsed: { increment: requestedOutput },
      atlasTotalTokensUsed: { increment: requestedTotal },
      [providerField]: { increment: requestedTotal },
    },
  });

  if (updated.count === 0) {
    const usage = await prisma.organization.findUnique({
      where: { id: input.orgId },
      select: {
        atlasInputTokensUsed: true,
        atlasOutputTokensUsed: true,
        atlasTotalTokensUsed: true,
        atlasGeminiTokensUsed: true,
        atlasGptTokensUsed: true,
        atlasClaudeTokensUsed: true,
      },
    });
    if (!usage) throw new AtlasTokenLimitError('total', plan);
    if (usage.atlasTotalTokensUsed + requestedTotal > limits.total) throw new AtlasTokenLimitError('total', plan);
    if (usage.atlasInputTokensUsed + requestedInput > limits.input) throw new AtlasTokenLimitError('input', plan);
    if (usage.atlasOutputTokensUsed + requestedOutput > limits.output) throw new AtlasTokenLimitError('output', plan);
    const providerUsed = usage[providerField];
    if (providerUsed + requestedTotal > providerLimit) throw new AtlasTokenLimitError('provider', plan);
    throw new AtlasTokenLimitError('total', plan);
  }

  return {
    orgId: input.orgId,
    userId: input.userId,
    userRole: input.userRole,
    plan,
    provider: input.provider,
    input: requestedInput,
    output: requestedOutput,
    periodStart,
  } satisfies AtlasTokenReservation;
}

export async function settleAtlasTokenReservation(
  reservation: AtlasTokenReservation,
  actual: TokenUsage | null,
) {
  const actualInput = actual ? Math.max(0, Math.min(reservation.input, Math.ceil(actual.input))) : 0;
  const actualOutput = actual ? Math.max(0, Math.min(reservation.output, Math.ceil(actual.output))) : 0;
  const providerField = providerCounter(reservation.provider);
  const updateUsage = prisma.organization.updateMany({
    where: { id: reservation.orgId, atlasUsagePeriodStart: reservation.periodStart },
    data: {
      atlasInputTokensUsed: { decrement: reservation.input - actualInput },
      atlasOutputTokensUsed: { decrement: reservation.output - actualOutput },
      atlasTotalTokensUsed: {
        decrement: (reservation.input + reservation.output) - (actualInput + actualOutput),
      },
      [providerField]: {
        decrement: (reservation.input + reservation.output) - (actualInput + actualOutput),
      },
    },
  });
  const actualTotal = actualInput + actualOutput;
  if (actualTotal === 0) {
    await updateUsage;
    return;
  }
  await prisma.$transaction([
    updateUsage,
    prisma.atlasCreditUsageEvent.create({
      data: {
        orgId: reservation.orgId,
        userId: reservation.userId,
        plan: reservation.plan,
        userRole: reservation.userRole,
        provider: reservation.provider,
        inputCredits: actualInput,
        outputCredits: actualOutput,
        totalCredits: actualTotal,
      },
    }),
  ]);
}

export async function getAtlasTokenUsage(orgId: string) {
  const { resetsAt } = await ensureCurrentAtlasUsagePeriod(orgId);
  const usage = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      plan: true,
      atlasInputTokensUsed: true,
      atlasOutputTokensUsed: true,
      atlasTotalTokensUsed: true,
      atlasGeminiTokensUsed: true,
      atlasGptTokensUsed: true,
      atlasClaudeTokensUsed: true,
      atlasUsagePeriodStart: true,
    },
  });
  if (!usage) return null;
  return {
    plan: normalizePlan(usage.plan),
    total: usage.atlasTotalTokensUsed,
    input: usage.atlasInputTokensUsed,
    output: usage.atlasOutputTokensUsed,
    providers: {
      GEMINI: usage.atlasGeminiTokensUsed,
      GPT: usage.atlasGptTokensUsed,
      CLAUDE: usage.atlasClaudeTokensUsed,
    },
    periodStart: usage.atlasUsagePeriodStart.toISOString(),
    resetsAt: resetsAt.toISOString(),
  };
}

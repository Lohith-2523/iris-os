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
  plan: PlanId;
};

export type AtlasTokenReservation = AtlasTokenBudgetContext & TokenUsage & {
  provider: AtlasProvider;
};

export class AtlasTokenLimitError extends Error {
  readonly status = 429;

  constructor(readonly dimension: 'total' | 'input' | 'output' | 'provider') {
    super(
      dimension === 'provider'
        ? 'This workspace has reached its Atlas AI provider token allocation.'
        : `This workspace has reached its Atlas AI ${dimension} token allocation.`,
    );
    this.name = 'AtlasTokenLimitError';
  }
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
  if (!limits) throw new AtlasTokenLimitError('total');

  const requestedInput = Math.max(0, Math.ceil(input.input));
  const requestedOutput = Math.max(0, Math.ceil(input.output));
  const requestedTotal = requestedInput + requestedOutput;
  const providerField = providerCounter(input.provider);
  const providerLimit = limits.providers[input.provider];

  const updated = await prisma.organization.updateMany({
    where: {
      id: input.orgId,
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
    if (!usage) throw new AtlasTokenLimitError('total');
    if (usage.atlasTotalTokensUsed + requestedTotal > limits.total) throw new AtlasTokenLimitError('total');
    if (usage.atlasInputTokensUsed + requestedInput > limits.input) throw new AtlasTokenLimitError('input');
    if (usage.atlasOutputTokensUsed + requestedOutput > limits.output) throw new AtlasTokenLimitError('output');
    const providerUsed = usage[providerField];
    if (providerUsed + requestedTotal > providerLimit) throw new AtlasTokenLimitError('provider');
    throw new AtlasTokenLimitError('total');
  }

  return {
    orgId: input.orgId,
    plan,
    provider: input.provider,
    input: requestedInput,
    output: requestedOutput,
  } satisfies AtlasTokenReservation;
}

export async function settleAtlasTokenReservation(
  reservation: AtlasTokenReservation,
  actual: TokenUsage | null,
) {
  const actualInput = actual ? Math.max(0, Math.min(reservation.input, Math.ceil(actual.input))) : 0;
  const actualOutput = actual ? Math.max(0, Math.min(reservation.output, Math.ceil(actual.output))) : 0;
  const providerField = providerCounter(reservation.provider);
  await prisma.organization.update({
    where: { id: reservation.orgId },
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
}

export async function getAtlasTokenUsage(orgId: string) {
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
  };
}

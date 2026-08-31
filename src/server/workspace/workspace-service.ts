import 'server-only';

import { cache } from 'react';
import { prisma } from '@/lib/db';
import type { WorkspaceReadModel } from '@/lib/workspace-read-model';
import { withDatabaseConnectionRetry } from '@/lib/database-resilience';
import type { RequestSecurityContext } from '@/server/security/request-security-context';
import { measureServerOperation } from '@/server/observability/performance';

export const getWorkspaceReadModel = cache(async (ctx: RequestSecurityContext): Promise<WorkspaceReadModel> => {
  return measureServerOperation('read-model.workspace', async () => {
    const [organizationIntegrations, googleCalendarConnection] = await withDatabaseConnectionRetry(() => Promise.all([
    prisma.integrationConnection.findMany({
      where: { orgId: ctx.orgId, provider: { not: 'GOOGLE' } },
      select: { provider: true, status: true, lastSync: true },
      orderBy: { provider: 'asc' },
    }),
    prisma.googleCalendarConnection.findUnique({
      where: { userId: ctx.userId },
      select: { status: true, lastSync: true },
    }),
  ]), { maxAttempts: 3, delaysMs: [150, 500] });

  const user = ctx.user;
  const organization = ctx.organization;
  const onboarding = ctx.onboardingState;
  const entitlements = ctx.entitlements;

    return {
    organization: {
      id: organization.id,
      name: organization.name,
      plan: ctx.plan,
      agencyTypes: organization.agencyTypes,
      billingEmail: organization.billingEmail,
      currency: organization.currency,
      preferences: organization.preferences ?? {},
      legalEntityName: organization.legalEntityName,
      billingAddressLine1: organization.billingAddressLine1,
      billingAddressLine2: organization.billingAddressLine2,
      billingCity: organization.billingCity,
      billingState: organization.billingState,
      billingPostalCode: organization.billingPostalCode,
      billingCountry: organization.billingCountry,
      gstNumber: organization.gstNumber,
      bankNames: organization.bankNames,
      invoiceLogoDataUrl: organization.invoiceLogoDataUrl,
      invoiceBrandColor: organization.invoiceBrandColor,
    },
    user: {
      id: user.id,
      orgId: user.orgId,
      clientId: user.clientId,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      accessPermissions: user.accessPermissions as string[] | null,
      hasMetaAccount: Boolean(user.client?.adAccountId),
      preferences: user.preferences ?? { theme: 'dark', settings: {} },
    },
    onboarding: {
      needsOnboarding: onboarding?.needsOnboarding ?? true,
      currentStep: onboarding?.currentStep ?? 0,
      checklist: onboarding?.checklist ?? {},
      draft: onboarding?.draft ?? {},
      completedAt: onboarding?.completedAt?.toISOString() ?? null,
    },
    integrations: [
      ...organizationIntegrations.map((integration) => ({
        provider: integration.provider,
        status: integration.status,
        lastSync: integration.lastSync?.toISOString() ?? null,
      })),
      {
        provider: 'GOOGLE',
        status: googleCalendarConnection?.status || 'DISCONNECTED',
        lastSync: googleCalendarConnection?.lastSync?.toISOString() ?? null,
      },
    ],
    entitlements: {
      specializationLimit: entitlements.specializationLimit,
      teamMemberLimit: entitlements.teamMemberLimit,
      clientLimit: entitlements.clientLimit,
      dailyBriefing: entitlements.dailyBriefing,
      strategyGeneration: entitlements.strategyGeneration,
      aiFeatures: entitlements.aiFeatures,
      messaging: entitlements.messaging,
      atlasCapabilities: entitlements.atlasCapabilities,
      messagingLimits: entitlements.messagingLimits,
    },
    };
  });
});

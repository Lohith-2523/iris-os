import type { PlanId } from './plan-entitlements';

export type WorkspaceReadModel = {
  organization: {
    id: string;
    name: string;
    plan: PlanId;
    agencyTypes: string[];
    billingEmail: string | null;
    currency: string;
    preferences: unknown;
    legalEntityName: string | null;
    billingAddressLine1: string | null;
    billingAddressLine2: string | null;
    billingCity: string | null;
    billingState: string | null;
    billingPostalCode: string | null;
    billingCountry: string | null;
    gstNumber: string | null;
    bankNames: string[];
    invoiceLogoDataUrl: string | null;
    invoiceBrandColor: string | null;
  };
  user: {
    id: string;
    orgId: string;
    clientId: string | null;
    name: string;
    username: string | null;
    email: string;
    role: string;
    avatarUrl: string | null;
    accessPermissions: string[] | null;
    deliveryWorkspace: boolean;
    hasMetaAccount: boolean;
    preferences: unknown;
  };
  onboarding: {
    needsOnboarding: boolean;
    currentStep: number;
    checklist: unknown;
    draft: unknown;
    completedAt: string | null;
  };
  integrations: Array<{
    provider: string;
    status: string;
    lastSync: string | null;
  }>;
  entitlements: {
    specializationLimit: number;
    teamMemberLimit: number | null;
    clientLimit: number;
    dailyBriefing: boolean;
    strategyGeneration: boolean;
    aiFeatures: boolean;
    messaging: boolean;
    atlasCapabilities: readonly string[];
    messagingLimits: unknown;
  };
};

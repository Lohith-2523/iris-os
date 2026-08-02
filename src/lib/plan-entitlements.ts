export const PLAN_IDS = ['BASIC', 'PRO', 'ADVANCED'] as const;

export type PlanId = (typeof PLAN_IDS)[number];
export type AtlasCapability = 'MEETING' | 'INVOICE' | 'ALL';

export type MessagingLimits = {
  textBytes: number;
  linkPreviewBytes: number;
  imageBytes: number;
  gifBytes: number;
  voiceBytes: number;
  videoBytes: number;
  documentBytes: number;
  archiveBytes: number;
  profileImageBytes: number;
  attachmentsPerMessage: number;
  combinedAttachmentBytes: number;
};

const advancedMessagingLimits: MessagingLimits = {
  textBytes: 16 * 1024,
  linkPreviewBytes: 4 * 1024,
  imageBytes: 12.5 * 1024 * 1024,
  gifBytes: 12.5 * 1024 * 1024,
  voiceBytes: 12.5 * 1024 * 1024,
  videoBytes: 50 * 1024 * 1024,
  documentBytes: 50 * 1024 * 1024,
  archiveBytes: 50 * 1024 * 1024,
  profileImageBytes: 5 * 1024 * 1024,
  attachmentsPerMessage: 10,
  combinedAttachmentBytes: 125 * 1024 * 1024,
};

function halfLimits(limits: MessagingLimits): MessagingLimits {
  return Object.fromEntries(
    Object.entries(limits).map(([key, value]) => [key, value / 2]),
  ) as MessagingLimits;
}

export const PLAN_ENTITLEMENTS = {
  BASIC: {
    specializationLimit: 10,
    teamMemberLimit: 2,
    clientLimit: 5,
    atlasCapabilities: [] as AtlasCapability[],
    dailyBriefing: false,
    strategyGeneration: false,
    aiFeatures: false,
    messaging: false,
    messagingLimits: null,
  },
  PRO: {
    specializationLimit: 10,
    teamMemberLimit: 4,
    clientLimit: 15,
    atlasCapabilities: ['MEETING', 'INVOICE'] as AtlasCapability[],
    dailyBriefing: false,
    strategyGeneration: false,
    aiFeatures: true,
    messaging: true,
    messagingLimits: halfLimits(advancedMessagingLimits),
  },
  ADVANCED: {
    specializationLimit: 10,
    teamMemberLimit: 15,
    clientLimit: 30,
    atlasCapabilities: ['ALL'] as AtlasCapability[],
    dailyBriefing: true,
    strategyGeneration: true,
    aiFeatures: true,
    messaging: true,
    messagingLimits: advancedMessagingLimits,
  },
} as const;

export function normalizePlan(plan: unknown): PlanId {
  const normalized = String(plan || 'BASIC').toUpperCase();
  return PLAN_IDS.includes(normalized as PlanId) ? normalized as PlanId : 'BASIC';
}

export function entitlementsFor(plan: unknown) {
  return PLAN_ENTITLEMENTS[normalizePlan(plan)];
}

export function canUseAtlasCapability(plan: unknown, capability: Exclude<AtlasCapability, 'ALL'>) {
  const capabilities = entitlementsFor(plan).atlasCapabilities as readonly AtlasCapability[];
  return capabilities.includes('ALL') || capabilities.includes(capability);
}

export function planLimitMessage(resource: 'clients' | 'team members', limit: number, plan: unknown) {
  return `The ${normalizePlan(plan).toLowerCase()} plan supports up to ${limit} ${resource}. Upgrade the workspace plan to add more.`;
}

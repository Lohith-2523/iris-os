import { describe, expect, it } from 'vitest';
import { canUseAtlasCapability, entitlementsFor, isPlanDowngrade, isPlanUpgrade, normalizePlan, planIncludes } from './plan-entitlements';

describe('plan entitlements', () => {
  it('does not treat agency specializations as a plan-limited resource', () => {
    expect(entitlementsFor('BASIC')).not.toHaveProperty('specializationLimit');
    expect(entitlementsFor('PRO')).not.toHaveProperty('specializationLimit');
    expect(entitlementsFor('ADVANCED')).not.toHaveProperty('specializationLimit');
  });

  it('matches the published workspace capacity limits', () => {
    expect(entitlementsFor('BASIC')).toMatchObject({ teamMemberLimit: 0, coreTeamMemberLimit: 0, clientLimit: 5, projectLimit: 5, activeLeadLimit: 20, dataTransferBytes: 300 * 1024 * 1024, monthlyInvoiceLimit: 3 });
    expect(entitlementsFor('PRO')).toMatchObject({ teamMemberLimit: 5, coreTeamMemberLimit: 2, clientLimit: 25, projectLimit: 50, activeLeadLimit: 150, dataTransferBytes: 5 * 1024 * 1024 * 1024, monthlyInvoiceLimit: null });
    expect(entitlementsFor('ADVANCED')).toMatchObject({ teamMemberLimit: 15, coreTeamMemberLimit: 5, clientLimit: null, projectLimit: null, activeLeadLimit: 500, dataTransferBytes: 25 * 1024 * 1024 * 1024, monthlyInvoiceLimit: null });
  });

  it('gives Free its published AI allowance while keeping premium workflow features gated', () => {
    expect(entitlementsFor('BASIC')).toMatchObject({
      aiFeatures: true,
      dailyBriefing: false,
      signedDocumentAutomation: false,
      strategyGeneration: false,
      messaging: false,
    });
  });

  it('allocates Miles token budgets by direction and provider', () => {
    expect(entitlementsFor('BASIC').atlasTokenLimits).toEqual({
      total: 20_000,
      input: 6_000,
      output: 14_000,
      providers: { GEMINI: 8_000, GPT: 8_000, CLAUDE: 4_000 },
    });
    expect(entitlementsFor('PRO').atlasTokenLimits).toEqual({
      total: 200_000,
      input: 60_000,
      output: 140_000,
      providers: { GEMINI: 80_000, GPT: 80_000, CLAUDE: 40_000 },
    });
    expect(entitlementsFor('ADVANCED').atlasTokenLimits).toEqual({
      total: 500_000,
      input: 150_000,
      output: 350_000,
      providers: { GEMINI: 200_000, GPT: 200_000, CLAUDE: 100_000 },
    });
  });

  it('limits Pro Miles actions and halves every messaging size/count limit', () => {
    const pro = entitlementsFor('PRO');
    const advanced = entitlementsFor('ADVANCED');
    expect(canUseAtlasCapability('PRO', 'MEETING')).toBe(true);
    expect(canUseAtlasCapability('PRO', 'INVOICE')).toBe(true);
    expect(pro.dailyBriefing).toBe(false);
    expect(pro.signedDocumentAutomation).toBe(false);
    expect(advanced.signedDocumentAutomation).toBe(true);
    expect(pro.strategyGeneration).toBe(false);
    for (const key of Object.keys(advanced.messagingLimits!) as Array<keyof NonNullable<typeof advanced.messagingLimits>>) {
      expect(pro.messagingLimits![key]).toBe(advanced.messagingLimits![key] / 2);
    }
  });

  it('compares plan access without hiding higher-tier features', () => {
    expect(planIncludes('BASIC', 'PRO')).toBe(false);
    expect(planIncludes('PRO', 'PRO')).toBe(true);
    expect(planIncludes('PRO', 'ADVANCED')).toBe(false);
    expect(planIncludes('ADVANCED', 'PRO')).toBe(true);
  });

  it('distinguishes upgrades from prohibited downgrades', () => {
    expect(isPlanUpgrade('BASIC', 'PRO')).toBe(true);
    expect(isPlanUpgrade('PRO', 'ADVANCED')).toBe(true);
    expect(isPlanDowngrade('PRO', 'BASIC')).toBe(true);
    expect(isPlanDowngrade('ADVANCED', 'PRO')).toBe(true);
    expect(isPlanUpgrade('PRO', 'PRO')).toBe(false);
    expect(isPlanDowngrade('PRO', 'PRO')).toBe(false);
  });

  it('defaults unknown plans to Basic instead of granting access', () => {
    expect(normalizePlan('enterprise')).toBe('BASIC');
  });
});

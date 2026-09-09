import { describe, expect, it } from 'vitest';
import { canUseAtlasCapability, entitlementsFor, normalizePlan, planIncludes } from './plan-entitlements';

describe('plan entitlements', () => {
  it('makes all ten specializations available to every plan', () => {
    expect(entitlementsFor('BASIC').specializationLimit).toBe(10);
    expect(entitlementsFor('PRO').specializationLimit).toBe(10);
    expect(entitlementsFor('ADVANCED').specializationLimit).toBe(10);
  });

  it('keeps Basic capacity while making Pro and Advanced team membership unlimited', () => {
    expect(entitlementsFor('BASIC')).toMatchObject({ teamMemberLimit: 2, clientLimit: 5 });
    expect(entitlementsFor('PRO')).toMatchObject({ teamMemberLimit: null, clientLimit: 15 });
    expect(entitlementsFor('ADVANCED')).toMatchObject({ teamMemberLimit: null, clientLimit: 30 });
  });

  it('keeps Basic free of AI and messaging features', () => {
    expect(entitlementsFor('BASIC')).toMatchObject({
      aiFeatures: false,
      dailyBriefing: false,
      signedDocumentAutomation: false,
      strategyGeneration: false,
      messaging: false,
    });
  });

  it('allocates Atlas token budgets by direction and provider', () => {
    expect(entitlementsFor('BASIC').atlasTokenLimits).toBeNull();
    expect(entitlementsFor('PRO').atlasTokenLimits).toEqual({
      total: 500_000,
      input: 150_000,
      output: 350_000,
      providers: { GEMINI: 200_000, GPT: 150_000, CLAUDE: 150_000 },
    });
    expect(entitlementsFor('ADVANCED').atlasTokenLimits).toEqual({
      total: 1_000_000,
      input: 300_000,
      output: 700_000,
      providers: { GEMINI: 400_000, GPT: 300_000, CLAUDE: 300_000 },
    });
  });

  it('limits Pro Atlas actions and halves every messaging size/count limit', () => {
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

  it('defaults unknown plans to Basic instead of granting access', () => {
    expect(normalizePlan('enterprise')).toBe('BASIC');
  });
});

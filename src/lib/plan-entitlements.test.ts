import { describe, expect, it } from 'vitest';
import { canUseAtlasCapability, entitlementsFor, normalizePlan } from './plan-entitlements';

describe('plan entitlements', () => {
  it('makes all ten specializations available to every plan', () => {
    expect(entitlementsFor('BASIC').specializationLimit).toBe(10);
    expect(entitlementsFor('PRO').specializationLimit).toBe(10);
    expect(entitlementsFor('ADVANCED').specializationLimit).toBe(10);
  });

  it('enforces client and member capacity by plan', () => {
    expect(entitlementsFor('BASIC')).toMatchObject({ teamMemberLimit: 2, clientLimit: 5 });
    expect(entitlementsFor('PRO')).toMatchObject({ teamMemberLimit: 4, clientLimit: 15 });
    expect(entitlementsFor('ADVANCED')).toMatchObject({ teamMemberLimit: 15, clientLimit: 30 });
  });

  it('keeps Basic free of AI and messaging features', () => {
    expect(entitlementsFor('BASIC')).toMatchObject({
      aiFeatures: false,
      dailyBriefing: false,
      strategyGeneration: false,
      messaging: false,
    });
  });

  it('limits Pro Atlas actions and halves every messaging size/count limit', () => {
    const pro = entitlementsFor('PRO');
    const advanced = entitlementsFor('ADVANCED');
    expect(canUseAtlasCapability('PRO', 'MEETING')).toBe(true);
    expect(canUseAtlasCapability('PRO', 'INVOICE')).toBe(true);
    expect(pro.dailyBriefing).toBe(false);
    expect(pro.strategyGeneration).toBe(false);
    for (const key of Object.keys(advanced.messagingLimits!) as Array<keyof NonNullable<typeof advanced.messagingLimits>>) {
      expect(pro.messagingLimits![key]).toBe(advanced.messagingLimits![key] / 2);
    }
  });

  it('defaults unknown plans to Basic instead of granting access', () => {
    expect(normalizePlan('enterprise')).toBe('BASIC');
  });
});

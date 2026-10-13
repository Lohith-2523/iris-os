import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ createMany: vi.fn(), updateMany: vi.fn(), findFirst: vi.fn(), count: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: {
  managedCoupon: { createMany: mocks.createMany, updateMany: mocks.updateMany, findFirst: mocks.findFirst },
  planCouponRedemption: { count: mocks.count },
} }));

import { ensureLegacyManagedCoupons, getOnboardingManagedCoupon, ONBOARDING_COUPON_ID } from './managed-coupons';

describe('managed onboarding coupon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createMany.mockResolvedValue({ count: 0 });
    mocks.updateMany.mockResolvedValue({ count: 0 });
    mocks.findFirst.mockResolvedValue({ id: ONBOARDING_COUPON_ID, discountPercent: 50, maxUses: 205 });
    mocks.count.mockResolvedValue(0);
  });

  it('seeds the automatic coupon with a 205-use cap', async () => {
    await ensureLegacyManagedCoupons();
    expect(mocks.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([expect.objectContaining({ id: ONBOARDING_COUPON_ID, discountPercent: 50, maxUses: 205 })]),
      skipDuplicates: true,
    }));
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: ONBOARDING_COUPON_ID }),
      data: { discountPercent: 50, maxUses: 205 },
    }));
  });

  it('stops offering the coupon after 205 paid redemptions', async () => {
    mocks.count.mockResolvedValue(205);
    await expect(getOnboardingManagedCoupon('PRO')).resolves.toBeNull();
    expect(mocks.count).toHaveBeenCalledWith({ where: { couponId: ONBOARDING_COUPON_ID } });
  });
});

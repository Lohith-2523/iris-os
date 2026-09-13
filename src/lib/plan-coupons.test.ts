import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { matchPlanCoupon } from './plan-coupons';

describe('plan coupons', () => {
  it('uses password-style exact matching', () => {
    expect(matchPlanCoupon('freeuserstd')).toBeNull();
    expect(matchPlanCoupon(' invalid coupon ')).toBeNull();
    expect(matchPlanCoupon('')).toBeNull();
  });
});

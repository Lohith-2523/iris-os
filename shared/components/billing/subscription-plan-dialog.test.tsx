import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pricingCatalog } from '@/lib/plan-pricing';
import { SubscriptionPlanDialog } from './subscription-plan-dialog';

vi.mock('./use-plan-pricing', () => ({
  usePlanPricing: () => ({ region: 'INTERNATIONAL', plans: pricingCatalog('INTERNATIONAL'), loading: false }),
}));

vi.mock('./razorpay-checkout', () => ({
  RazorpayCheckout: ({ plan, onPriceChange }: {
    plan: 'PRO' | 'ADVANCED';
    onPriceChange?: (quote: object) => void;
  }) => (
    <button type="button" onClick={() => onPriceChange?.({
      currency: 'USD',
      listAmount: plan === 'PRO' ? 2_199 : 4_999,
      baseAmount: plan === 'PRO' ? 1_979 : 4_499,
      discountAmount: plan === 'PRO' ? 220 : 500,
      discountPercent: 10,
      taxAmount: plan === 'PRO' ? 356 : 810,
      totalAmount: plan === 'PRO' ? 2_335 : 5_309,
    })}>
      Apply {plan} coupon
    </button>
  ),
}));

describe('SubscriptionPlanDialog coupon pricing', () => {
  afterEach(cleanup);

  it('updates the visible settings price from the validated coupon quote', () => {
    render(
      <SubscriptionPlanDialog
        open
        currentPlan="BASIC"
        feature="your workspace"
        requiredPlan="BASIC"
        showCouponAdjustedPrice
        onClose={() => undefined}
      />,
    );

    const proCard = screen.getByRole('heading', { name: 'Pro' }).closest('article');
    const freeCard = screen.getByRole('heading', { name: 'Free' }).closest('article');
    expect(proCard).not.toBeNull();
    expect(freeCard).not.toBeNull();
    expect(within(freeCard!).getByText('/mo')).toBeInTheDocument();
    expect(within(proCard!).getByText('$10.99')).toBeInTheDocument();

    fireEvent.click(within(proCard!).getByRole('button', { name: 'Apply PRO coupon' }));

    expect(within(proCard!).getByText('$19.79')).toBeInTheDocument();
    expect(within(proCard!).getByText('10% off')).toBeInTheDocument();
    expect(within(proCard!).queryByText('$10.99')).not.toBeInTheDocument();
  });
});

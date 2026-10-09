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
      listAmount: plan === 'PRO' ? 3_999 : 7_999,
      baseAmount: plan === 'PRO' ? 3_599 : 7_199,
      discountAmount: plan === 'PRO' ? 400 : 800,
      discountPercent: 10,
      taxAmount: plan === 'PRO' ? 648 : 1_296,
      totalAmount: plan === 'PRO' ? 4_247 : 8_495,
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
    expect(within(proCard!).getByText('$19.99')).toBeInTheDocument();

    fireEvent.click(within(proCard!).getByRole('button', { name: 'Apply PRO coupon' }));

    expect(within(proCard!).getByText('$35.99')).toBeInTheDocument();
    expect(within(proCard!).getByText('10% off early bird offer')).toBeInTheDocument();
    expect(within(proCard!).queryByText('$19.99')).not.toBeInTheDocument();
  });
});

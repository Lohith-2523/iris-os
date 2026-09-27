import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { formatPlanMoney, pricingCatalog } from '@/lib/plan-pricing';
import { IrisPricingComparison } from './iris-pricing-comparison';

describe('IrisPricingComparison', () => {
  afterEach(cleanup);

  it('shows the early-bird list price on paid landing-page cards', () => {
    const { container } = render(
      <IrisPricingComparison
        plans={pricingCatalog('INDIA')}
        region="INDIA"
        showFullPricingLink
      />,
    );

    expect(screen.getAllByText('50% off early bird offer')).toHaveLength(2);
    expect(container.querySelectorAll('del')).toHaveLength(2);
    const freeCard = screen.getByRole('heading', { name: 'Free' }).closest('article');
    expect(freeCard).not.toBeNull();
    expect(within(freeCard!).getByText(formatPlanMoney(0, 'INR'))).toBeInTheDocument();
    expect(within(freeCard!).getByText('/month')).toBeInTheDocument();
    expect(within(freeCard!).getAllByRole('listitem')).toHaveLength(6);
  });

  it('shows the same early-bird treatment in the full pricing comparison', () => {
    const { container } = render(
      <IrisPricingComparison plans={pricingCatalog('INTERNATIONAL')} region="INTERNATIONAL" />,
    );

    expect(screen.getAllByText('50% off early bird offer')).toHaveLength(2);
    expect(container.querySelectorAll('del')).toHaveLength(2);
    const freeCard = screen.getByRole('heading', { name: 'Free' }).closest('article');
    expect(freeCard).not.toBeNull();
    expect(within(freeCard!).getByText('$0')).toBeInTheDocument();
    expect(within(freeCard!).getByText('/mo')).toBeInTheDocument();
  });
});

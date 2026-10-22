import { render, screen, within, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PrivacyPage, { metadata as privacyMetadata } from '../../../src/app/privacy/page';
import TermsPage from '../../../src/app/terms/page';
import CancellationPage from '../../../src/app/cancellation-refund-policy/page';
import DpaPage from '../../../src/app/data-processing-agreement/page';
import AiPage from '../../../src/app/ai-usage-policy/page';
import ProvidersPage from '../../../src/app/subprocessors/page';
import { LEGAL_LINKS } from '@/lib/legal/policies';

vi.mock('@/components/marketing/marketing-header', () => ({ MarketingHeader: () => <header>IrisOS</header> }));
vi.mock('next/image', () => ({ default: ({ alt }: { alt: string }) => <span>{alt}</span> }));

afterEach(cleanup);

describe('legal policy pages', () => {
  it.each([
    ['Privacy Policy', PrivacyPage],
    ['Terms of Service', TermsPage],
    ['Cancellation, Suspension and Refund Policy', CancellationPage],
    ['Data Processing Agreement', DpaPage],
    ['AI Usage and Credit Policy', AiPage],
    ['Subprocessor and Service Provider Register', ProvidersPage],
  ] as const)('renders %s with working section navigation', (title, Page) => {
    const { container } = render(<Page />);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(container).toHaveTextContent('GRL Enterprises');
    expect(container).toHaveTextContent('Bengaluru');
    expect(container).toHaveTextContent('Last updated: October 22, 2026');
    expect(container).not.toHaveTextContent(/draft|not yet effective|before execution|proposed allocation/i);
    for (const anchor of within(screen.getByRole('navigation', { name: 'Policy contents' })).getAllByRole('link')) {
      const href = anchor.getAttribute('href')!;
      expect(container.querySelector(href)).not.toBeNull();
    }
    const footer = screen.getByRole('navigation', { name: 'Legal documents' });
    for (const link of LEGAL_LINKS) expect(within(footer).getByRole('link', { name: link.label })).toHaveAttribute('href', link.href);
  });

  it('does not apply noindex metadata', () => {
    expect(privacyMetadata.robots).toBeUndefined();
  });

  it('discloses immediate cancellation without claiming recurring checkout', () => {
    const { container } = render(<CancellationPage />);
    expect(container).toHaveTextContent('one-time payment');
    expect(container).toHaveTextContent('immediately');
    expect(container).toHaveTextContent('mandatory legal remedies');
  });

  it('uses the general legal contact except for the data processor agreement', () => {
    for (const Page of [PrivacyPage, TermsPage, CancellationPage, AiPage, ProvidersPage]) {
      const { container, unmount } = render(<Page />);
      expect(container).toHaveTextContent('contact@irisos.app');
      expect(container).not.toHaveTextContent('cto.admin@irisos.app');
      unmount();
    }

    const { container } = render(<DpaPage />);
    expect(container).toHaveTextContent('cto.admin@irisos.app');
    expect(container).not.toHaveTextContent('contact@irisos.app');
  });

  it('incorporates the data processing agreement into the terms', () => {
    const { container: terms } = render(<TermsPage />);
    expect(terms).toHaveTextContent('The Data Processing Agreement forms part of these Terms');
    cleanup();

    const { container: dpa } = render(<DpaPage />);
    expect(dpa).toHaveTextContent('This Data Processing Agreement forms part of the Terms of Service');
    expect(dpa).toHaveTextContent('The obligations in this DPA apply throughout the covered processing');
  });
});

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IrisMarketingHeader } from './iris-marketing-header';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('next/image', () => ({
  default: ({ priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => {
    void priority;
    return createElement('img', props);
  },
}));

describe('IrisMarketingHeader', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows login/signup for a known device', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      knownDevice: true,
      directAccess: false,
      landingPreference: 'HOME',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    render(<IrisMarketingHeader />);

    expect(screen.getAllByLabelText('Loading account access')).toHaveLength(2);
    expect(screen.queryByRole('link', { name: 'Join the Waitlist' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('link', { name: 'Login / Sign up' })).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: 'Join the Waitlist' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Login / Sign up' })).toHaveAttribute('href', '/login');
  });

  it('shows login/signup for a new device', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      knownDevice: false,
      directAccess: false,
      landingPreference: 'ASK',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    render(<IrisMarketingHeader />);

    expect(screen.getAllByLabelText('Loading account access')).toHaveLength(2);
    expect(screen.queryByRole('link', { name: 'Join the Waitlist' })).not.toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/auth/device-access', expect.objectContaining({ cache: 'no-store' })));
    await waitFor(() => expect(screen.getByRole('link', { name: 'Login / Sign up' })).toHaveAttribute('href', '/login'));
    expect(screen.queryByRole('link', { name: 'Join the Waitlist' })).not.toBeInTheDocument();
  });

  it('renders a resolved access action immediately without another request', () => {
    const request = vi.fn();
    vi.stubGlobal('fetch', request);

    render(<IrisMarketingHeader knownDevice />);

    expect(screen.getByRole('link', { name: 'Login / Sign up' })).toHaveAttribute('href', '/login');
    expect(screen.queryByLabelText('Loading account access')).not.toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });

  it('routes the header pricing links to the pricing page', () => {
    render(<IrisMarketingHeader knownDevice={false} />);

    for (const link of screen.getAllByRole('link', { name: 'Pricing' })) {
      expect(link).toHaveAttribute('href', '/pricing');
    }
  });
});

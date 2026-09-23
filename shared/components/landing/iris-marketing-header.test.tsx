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
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('replaces the waitlist action with login/signup for a valid identification token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      knownDevice: true,
      directAccess: false,
      landingPreference: 'HOME',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    render(<IrisMarketingHeader />);

    await waitFor(() => expect(screen.getByRole('link', { name: 'Login / Sign up' })).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: 'Join the Waitlist' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Login / Sign up' })).toHaveAttribute('href', '/login');
  });

  it('keeps the waitlist action when no valid identification token exists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      knownDevice: false,
      directAccess: false,
      landingPreference: 'ASK',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    render(<IrisMarketingHeader />);

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/auth/device-access', expect.objectContaining({ cache: 'no-store' })));
    expect(screen.getByRole('link', { name: 'Join the Waitlist' })).toHaveAttribute('href', '/waitlist');
    expect(screen.queryByRole('link', { name: 'Login / Sign up' })).not.toBeInTheDocument();
  });
});

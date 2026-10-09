import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceWorkerRegistration } from './service-worker-registration';

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

describe('IrisOS install prompt', () => {
  beforeEach(() => {
    pathname = '/';
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-pwa-install-available');
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: query === '(min-width: 768px)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
  });

  it('offers quick install on the second landing-page visit', async () => {
    window.localStorage.setItem('iris-os:landing-visit-count', '1');
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
      prompt: typeof prompt;
      userChoice: Promise<{ outcome: 'accepted'; platform: string }>;
    };
    event.prompt = prompt;
    event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

    render(<ServiceWorkerRegistration />);
    act(() => {
      window.dispatchEvent(event);
    });

    expect(await screen.findByTestId('pwa-install-overlay')).toHaveClass('inset-0');
    expect(screen.getByText('Install the IrisOS app')).toBeInTheDocument();
    expect(screen.getByText('Install the IrisOS app for free for a more seamless and uninterrupted user experience')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Quick install' }));
    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps the install entry point available after the custom prompt is dismissed', async () => {
    window.localStorage.setItem('iris-os:landing-visit-count', '1');
    render(<ServiceWorkerRegistration />);
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }) });
    act(() => {
      window.dispatchEvent(event);
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss app install prompt' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.documentElement.dataset.pwaInstallAvailable).toBe('true');

    act(() => window.dispatchEvent(new Event('iris-os:show-install-prompt')));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('keeps the install entry point available after the browser prompt is cancelled', async () => {
    window.localStorage.setItem('iris-os:landing-visit-count', '1');
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }) });
    render(<ServiceWorkerRegistration />);
    act(() => window.dispatchEvent(event));

    fireEvent.click(await screen.findByRole('button', { name: 'Quick install' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.documentElement.dataset.pwaInstallAvailable).toBe('true');

    act(() => window.dispatchEvent(new Event('iris-os:show-install-prompt')));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('does not expose the install flow on mobile viewports', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    render(<ServiceWorkerRegistration />);
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }) });
    act(() => {
      window.dispatchEvent(event);
      window.dispatchEvent(new Event('iris-os:show-install-prompt'));
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.documentElement.dataset.pwaInstallAvailable).toBe('false');
  });

  it('does not automatically open on the first landing-page visit but remains manually accessible', async () => {
    render(<ServiceWorkerRegistration />);
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }) });
    act(() => window.dispatchEvent(event));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    act(() => window.dispatchEvent(new Event('iris-os:show-install-prompt')));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('never opens outside the landing page', () => {
    pathname = '/dashboard';
    window.localStorage.setItem('iris-os:landing-visit-count', '4');
    render(<ServiceWorkerRegistration />);
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }) });
    act(() => {
      window.dispatchEvent(event);
      window.dispatchEvent(new Event('iris-os:show-install-prompt'));
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('disables future automatic prompts without removing manual access', async () => {
    window.localStorage.setItem('iris-os:landing-visit-count', '1');
    render(<ServiceWorkerRegistration />);
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }) });
    act(() => window.dispatchEvent(event));
    fireEvent.click(await screen.findByRole('button', { name: "Don't ask again" }));

    expect(window.localStorage.getItem('iris-os:pwa-auto-prompt-disabled')).toBe('true');
    expect(document.documentElement.dataset.pwaInstallAvailable).toBe('true');
    act(() => window.dispatchEvent(new Event('iris-os:show-install-prompt')));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});

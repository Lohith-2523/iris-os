import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceWorkerRegistration } from './service-worker-registration';

describe('Iris OS install prompt', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
  });

  it('offers quick install when Chrome reports the PWA is installable', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
      prompt: typeof prompt;
      userChoice: Promise<{ outcome: 'accepted'; platform: string }>;
    };
    event.prompt = prompt;
    event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

    render(<ServiceWorkerRegistration />);
    window.dispatchEvent(event);

    expect(await screen.findByTestId('pwa-install-overlay')).toHaveClass('inset-0');
    expect(screen.getByText('Browser install button')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Quick install' }));
    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('does not ask again in the same session after dismissal', async () => {
    render(<ServiceWorkerRegistration />);
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }) });
    window.dispatchEvent(event);

    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss app install prompt' }));
    expect(sessionStorage.getItem('iris-os:pwa-install-dismissed')).toBe('true');
  });
});

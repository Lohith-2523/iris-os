import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));

import { HelpCenter } from './help-center';

describe('HelpCenter confirmations', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })));
    vi.stubGlobal('crypto', { randomUUID: () => '00000000-0000-4000-8000-000000000000' });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('uses feedback-specific success wording', async () => {
    render(<HelpCenter />);
    fireEvent.click(screen.getByRole('button', { name: 'Get help' }));
    fireEvent.click(screen.getByRole('button', { name: /Share feedback/ }));
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Asha' } });
    fireEvent.change(screen.getByPlaceholderText('Work email'), { target: { value: 'asha@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Subject'), { target: { value: 'Navigation feedback' } });
    fireEvent.change(screen.getByPlaceholderText('Tell us what happened or what you need…'), { target: { value: 'The navigation could be more compact.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send to IrisOS' }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Your feedback has been sent. You can expect a response within a day.'));
  });

  it('restarts the active page tour from the help menu', () => {
    const listener = vi.fn();
    window.addEventListener('iris:workspace-quick-tour', listener);
    render(<HelpCenter />);

    fireEvent.click(screen.getByRole('button', { name: 'Get help' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quick Tour' }));

    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener('iris:workspace-quick-tour', listener);
  });
});

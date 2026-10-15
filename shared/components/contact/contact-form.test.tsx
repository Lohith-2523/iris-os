import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/script', () => ({
  default: ({ onReady }: { onReady?: () => void }) => {
    queueMicrotask(() => onReady?.());
    return null;
  },
}));

import { ContactForm } from './contact-form';

const renderCaptcha = vi.fn<(container: HTMLElement, options: { 'error-callback': () => void }) => number>(() => 7);
const resetCaptcha = vi.fn();

describe('ContactForm reCAPTCHA loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'grecaptcha', {
      configurable: true,
      value: {
        enterprise: {
          ready: (callback: () => void) => callback(),
          render: renderCaptcha,
          reset: resetCaptcha,
        },
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(window, 'grecaptcha');
  });

  it('does not render the Enterprise widget until a valid form is submitted', async () => {
    render(<ContactForm siteKey="enterprise-site-key" />);
    expect(renderCaptcha).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Avery Morgan' } });
    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'avery@example.com' } });
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Product inquiry' } });
    fireEvent.change(screen.getByLabelText('How can we help?'), { target: { value: 'Please tell me more about IrisOS.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => expect(renderCaptcha).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('dialog', { name: 'Confirming you’re human' })).toHaveAttribute('aria-hidden', 'false');
  });

  it('reports a verification rejection without repeatedly resetting the widget', async () => {
    renderCaptcha.mockImplementationOnce((_container, options) => {
      options['error-callback']();
      return 8;
    });
    render(<ContactForm siteKey="production-site-key" />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Avery Morgan' } });
    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'avery@example.com' } });
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Product inquiry' } });
    fireEvent.change(screen.getByLabelText('How can we help?'), { target: { value: 'Please tell me more about IrisOS.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Verification could not start.');
    expect(resetCaptcha).not.toHaveBeenCalled();
  });
});

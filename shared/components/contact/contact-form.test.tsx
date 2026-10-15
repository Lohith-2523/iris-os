import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/script', () => ({
  default: ({ src }: { src: string }) => <span data-testid="recaptcha-script" data-src={src} />,
}));

import { ContactForm } from './contact-form';

const resetCaptcha = vi.fn();

function completeContactForm() {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Avery Morgan' } });
  fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'avery@example.com' } });
  fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Product inquiry' } });
  fireEvent.change(screen.getByLabelText('How can we help?'), { target: { value: 'Please tell me more about IrisOS.' } });
}

describe('ContactForm reCAPTCHA loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'grecaptcha', {
      configurable: true,
      value: { enterprise: { reset: resetCaptcha } },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(window, 'grecaptcha');
    vi.unstubAllGlobals();
  });

  it('mounts the automatic Enterprise widget only after a valid form submission', () => {
    const { container } = render(<ContactForm siteKey="enterprise-site-key" />);
    expect(screen.queryByTestId('recaptcha-script')).not.toBeInTheDocument();
    expect(container.querySelector('.g-recaptcha')).not.toBeInTheDocument();

    completeContactForm();
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(screen.getByTestId('recaptcha-script')).toHaveAttribute('data-src', 'https://www.google.com/recaptcha/enterprise.js');
    const widget = container.querySelector('.g-recaptcha');
    expect(widget).toHaveAttribute('data-sitekey', 'enterprise-site-key');
    expect(widget).toHaveAttribute('data-action', 'CONTACT');
    expect(widget).toHaveAttribute('data-callback', 'irisContactRecaptchaVerified');
    expect(screen.getByRole('dialog', { name: /Confirming you.re human/ })).toHaveAttribute('aria-hidden', 'false');
  });

  it('forwards the generated token to the contact endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    render(<ContactForm siteKey="enterprise-site-key" />);

    completeContactForm();
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    window.irisContactRecaptchaVerified?.('generated-enterprise-token');

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual(expect.objectContaining({
      recaptchaToken: 'generated-enterprise-token',
    }));
    expect(await screen.findByText(/Response sent\./)).toBeInTheDocument();
  });

  it('reports a widget verification error without repeatedly resetting it', async () => {
    render(<ContactForm siteKey="enterprise-site-key" />);
    completeContactForm();
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    window.irisContactRecaptchaError?.();

    expect(await screen.findByRole('alert')).toHaveTextContent('Verification could not start.');
    expect(resetCaptcha).not.toHaveBeenCalled();
  });
});
